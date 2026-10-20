import { type BalanceView, type Prisma, PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { z } from 'zod';

import { createDatabaseAdapter } from '../src/server/databaseAdapter';

const { values } = parseArgs({
  options: {
    capture: { type: 'boolean', default: false },
    entries: { type: 'boolean', default: false },
    snapshot: { type: 'string', default: 'scripts/seeded-balance-baseline.json' },
  },
});
assert(!(values.capture && values.entries), 'Capture the legacy implementation before migration');
const databaseUrl = process.env.DATABASE_URL;
assert(
  databaseUrl && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(databaseUrl).hostname),
  'Use the local seeded database',
);
const db = new PrismaClient({ adapter: createDatabaseAdapter(databaseUrl) });
const timings: { scope: string; ms: number }[] = [];
const snapshotSchema = z.object({
  capturedAt: z.string(),
  expenses: z.number(),
  participants: z.number(),
  queries: z.array(
    z.object({
      name: z.string(),
      where: z.object({
        userId: z.number().optional(),
        friendId: z.number().optional(),
        groupId: z.number().optional(),
      }),
      rows: z.number(),
      digest: z.string(),
    }),
  ),
});
const normalize = (rows: BalanceView[]) =>
  rows
    .map((row) => ({
      userId: row.userId,
      friendId: row.friendId,
      groupId: row.groupId,
      currency: row.currency,
      amount: row.amount.toString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
const digest = (rows: BalanceView[]) =>
  createHash('sha256')
    .update(JSON.stringify(normalize(rows)))
    .digest('hex');

try {
  const saved = values.capture
    ? undefined
    : snapshotSchema.parse(JSON.parse(await readFile(values.snapshot, 'utf8')));
  // Load the new service only when explicitly requested, after its migration exists.
  const queryEntries = values.entries
    ? (await import('../src/server/api/services/balanceService')).getBalances
    : undefined;
  const snapshot = await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const [expenses, participants, users, groups] = await Promise.all([
        tx.expense.count(),
        tx.expenseParticipant.count(),
        tx.user.findMany({ select: { id: true } }),
        tx.group.findMany({ select: { id: true } }),
      ]);
      const all = await tx.balanceView.findMany();
      assert(all.length, 'Seed the database before capturing balances');
      const pairs = [
        ...new Map(
          all.map((row) => [
            `${row.userId}/${row.friendId}`,
            { userId: row.userId, friendId: row.friendId },
          ]),
        ).values(),
      ]
        .sort((a, b) => a.userId - b.userId || a.friendId - b.friendId)
        .slice(0, 50);
      const queries = saved?.queries ?? [
        { name: 'all', where: {}, rows: 0, digest: '' },
        ...users.map(({ id }) => ({
          name: `user/${id}`,
          where: { userId: id },
          rows: 0,
          digest: '',
        })),
        ...groups.map(({ id }) => ({
          name: `group/${id}`,
          where: { groupId: id },
          rows: 0,
          digest: '',
        })),
        ...pairs.map((where) => ({
          name: `pair/${where.userId}/${where.friendId}`,
          where,
          rows: 0,
          digest: '',
        })),
      ];
      const results = await queries.reduce<Promise<typeof queries>>(async (pending, query) => {
        const previous = await pending;
        const where: Prisma.BalanceViewWhereInput = query.where;
        const started = performance.now();
        const rows = queryEntries
          ? await queryEntries(tx, { where: query.where })
          : await tx.balanceView.findMany({ where });
        timings.push({ scope: query.name.split('/')[0]!, ms: performance.now() - started });
        const result = { ...query, rows: rows.length, digest: digest(rows) };
        if (saved) {
          assert.deepEqual(result, query, `Balance baseline changed: ${query.name}`);
        }
        return [...previous, result];
      }, Promise.resolve([]));

      // Independent arithmetic oracle: no balance SQL/view is used to construct it.
      const records = await tx.expense.findMany({
        where: { deletedAt: null },
        include: { expenseParticipants: true },
      });
      const oracle = new Map<string, BalanceView>();
      records.forEach((expense) =>
        expense.expenseParticipants.forEach((participant) => {
          if (participant.userId === expense.paidBy) {
            return;
          }
          [
            { userId: participant.userId, friendId: expense.paidBy, amount: participant.amount },
            { userId: expense.paidBy, friendId: participant.userId, amount: -participant.amount },
          ].forEach((entry) => {
            const key = `${entry.userId}/${entry.friendId}/${expense.groupId}/${expense.currency}`;
            const existing = oracle.get(key);
            oracle.set(key, {
              ...entry,
              groupId: expense.groupId,
              currency: expense.currency,
              amount: (existing?.amount ?? 0n) + entry.amount,
              createdAt:
                existing && existing.createdAt < expense.createdAt
                  ? existing.createdAt
                  : expense.createdAt,
              updatedAt:
                existing && existing.updatedAt > expense.updatedAt
                  ? existing.updatedAt
                  : expense.updatedAt,
            });
          });
        }),
      );
      assert.deepEqual(
        normalize(all),
        normalize([...oracle.values()]),
        'Legacy view differs from participant arithmetic',
      );
      assert.equal(
        all.reduce((sum, row) => sum + row.amount, 0n),
        0n,
        'Mirrored amounts must cancel',
      );
      if (saved) {
        assert.equal(expenses, saved.expenses, 'Seeded expense count changed');
        assert.equal(participants, saved.participants, 'Seeded participant count changed');
      }
      return {
        capturedAt: saved?.capturedAt ?? new Date().toISOString(),
        expenses,
        participants,
        queries: results,
      };
    },
    { timeout: 120_000, isolationLevel: 'RepeatableRead' },
  );
  if (values.capture) {
    await writeFile(values.snapshot, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: 'wx' });
  }
  console.info(
    `${snapshot.queries.length} seeded balance query baselines passed (${values.entries ? 'entries service' : 'legacy view'}); independent monetary/metadata oracle passed.`,
  );
  console.table(
    ['all', 'user', 'group', 'pair'].map((scope) => {
      const samples = timings
        .filter((timing) => timing.scope === scope)
        .map((timing) => timing.ms)
        .sort((a, b) => a - b);
      return {
        scope,
        queries: samples.length,
        medianMs: Number(samples[Math.floor(samples.length / 2)]!.toFixed(3)),
      };
    }),
  );
} finally {
  await db.$disconnect();
}
