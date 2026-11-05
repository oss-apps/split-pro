import { deleteAccount } from '~/server/api/services/deleteAccount';
import { createDatabaseUser } from '~/tests/helpers/databaseFactories';

import { db } from './database';
import { accountingSnapshot, testGroup, testScenario, testUser } from './factories';
import { callerFor } from './trpc';

describe('account deletion', () => {
  it.each([false, true])(
    'removes local avatars only when no shared record uses them (shared=%s)',
    async (shared) => {
      const { owner, group } = await testScenario();
      const key = `${owner.id}/${randomUUID()}.webp`;
      const avatar = path.join(process.cwd(), 'uploads', key);
      const thumbnail = avatar.replace('.webp', '-thumb.webp');
      await mkdir(path.dirname(avatar), { recursive: true });
      await writeFile(avatar, 'avatar');
      await writeFile(thumbnail, 'thumbnail');
      try {
        await db.user.update({ where: { id: owner.id }, data: { image: key } });
        if (shared) {
          await db.group.update({ where: { id: group.id }, data: { image: key } });
        }
        await callerFor(owner.id).user.deleteAccount();
        if (shared) {
          expect(await readFile(avatar, 'utf8')).toBe('avatar');
          expect(await readFile(thumbnail, 'utf8')).toBe('thumbnail');
        } else {
          await expect(readFile(avatar)).rejects.toMatchObject({ code: 'ENOENT' });
          await expect(readFile(thumbnail)).rejects.toMatchObject({ code: 'ENOENT' });
        }
      } finally {
        await Promise.all([rm(avatar, { force: true }), rm(thumbnail, { force: true })]);
      }
    },
  );

  it('clears identity and credentials while preserving shared history and outstanding debt', async () => {
    const { owner, member, group, input } = await testScenario();
    const [expense] = await callerFor(owner.id).expense.addOrEditExpense(input);
    await db.user.update({
      where: { id: owner.id },
      data: {
        image: 'https://example.test/avatar.webp',
        emailVerified: new Date(),
        bankingId: 'private-bank-id',
        obapiProviderId: 'private-bank-token',
        defaultCurrency: 'EUR',
        hiddenFriendIds: [member.id],
      },
    });
    const expires = new Date(Date.now() + 60_000);
    await db.account.create({
      data: { userId: owner.id, type: 'oauth', provider: 'google', providerAccountId: 'private' },
    });
    await db.session.createMany({
      data: ['device-a', 'device-b'].map((sessionToken) => ({
        userId: owner.id,
        sessionToken,
        expires,
      })),
    });
    await db.verificationToken.create({
      data: { identifier: owner.email!, token: 'old-login-token', expires },
    });
    await db.cachedBankData.create({
      data: { userId: owner.id, obapiProviderId: 'private', data: '{}', lastFetched: new Date() },
    });
    await db.pushNotification.create({
      data: {
        userId: owner.id,
        endpoint: 'private-endpoint',
        subscription: 'private-subscription',
      },
    });
    await db.friendDefaultSplit.create({
      data: { userAId: owner.id, userBId: member.id, splitType: 'EQUAL', shares: {} },
    });
    await db.expenseNote.create({
      data: { expenseId: expense!.id, createdById: owner.id, note: 'Shared note' },
    });
    const before = await accountingSnapshot();
    await callerFor(owner.id).user.deleteAccount();

    expect(await db.user.findUniqueOrThrow({ where: { id: owner.id } })).toMatchObject({
      deletedAt: expect.any(Date),
      name: 'Deleted user',
      email: null,
      emailVerified: null,
      image: null,
      bankingId: null,
      obapiProviderId: null,
      currency: 'USD',
      defaultCurrency: null,
      preferredLanguage: '',
      hiddenFriendIds: [],
    });
    expect(await accountingSnapshot()).toEqual(before);
    expect(await db.group.findUniqueOrThrow({ where: { id: group.id } })).toMatchObject({
      userId: member.id,
    });
    expect(await db.groupUser.count({ where: { groupId: group.id } })).toBe(2);
    expect(await db.expenseNote.count()).toBe(1);
    expect(await db.account.count()).toBe(0);
    expect(await db.session.count()).toBe(0);
    expect(await db.verificationToken.count()).toBe(0);
    expect(await db.cachedBankData.count()).toBe(0);
    expect(await db.pushNotification.count()).toBe(0);
    expect(await db.friendDefaultSplit.count()).toBe(0);

    const history = await callerFor(member.id).expense.getExpenseDetails({
      expenseId: expense!.id,
    });
    expect(history?.paidByUser.name).toBe('Deleted user');
    const activity = await callerFor(member.id).expense.getAllExpenses({});
    expect(activity.items[0]?.expense.paidByUser.deletedAt).toEqual(expect.any(Date));
    const replacement = await createDatabaseUser(db, { email: owner.email });
    expect(replacement.id).not.toBe(owner.id);
    expect(await db.groupUser.count({ where: { userId: replacement.id } })).toBe(0);
  });

  it('transfers archived groups, excludes deleted successors, and retains groups without a successor', async () => {
    const { owner, member, group } = await testScenario();
    const deletedMember = await createDatabaseUser(db, {
      deletedAt: new Date(),
      name: 'Deleted user',
    });
    await db.groupUser.create({ data: { groupId: group.id, userId: deletedMember.id } });
    await db.group.update({ where: { id: group.id }, data: { archivedAt: new Date() } });
    const alone = await testGroup(owner.id);
    const onlyDeleted = await testGroup(owner.id, [deletedMember.id]);
    await callerFor(owner.id).user.deleteAccount();
    expect(await db.group.findUniqueOrThrow({ where: { id: group.id } })).toMatchObject({
      userId: member.id,
    });
    expect(await db.group.findUniqueOrThrow({ where: { id: alone.id } })).toMatchObject({
      userId: owner.id,
    });
    expect(await db.group.findUniqueOrThrow({ where: { id: onlyDeleted.id } })).toMatchObject({
      userId: owner.id,
    });
    // The final active member can also delete their account without losing history.
    await callerFor(member.id).user.deleteAccount();
    expect(await db.group.count()).toBe(3);
  });

  it('rejects unauthenticated callers and stale sessions after deletion', async () => {
    const { owner, member } = await testScenario();
    await expect(callerFor(null).user.deleteAccount()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    const staleCaller = callerFor(owner.id);
    await staleCaller.user.deleteAccount();
    await expect(staleCaller.user.me()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(staleCaller.user.updateUserDetail({ name: 'Restored' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(await db.user.findUniqueOrThrow({ where: { id: member.id } })).toMatchObject({
      deletedAt: null,
    });
  });

  it('is idempotent for simultaneous deletion requests', async () => {
    const { owner } = await testScenario();
    await Promise.all([deleteAccount(db, owner.id), deleteAccount(db, owner.id)]);
    const deleted = await db.user.findUniqueOrThrow({ where: { id: owner.id } });
    await deleteAccount(db, owner.id);
    expect(await db.user.findUniqueOrThrow({ where: { id: owner.id } })).toEqual(deleted);
  });

  it('rolls back identity, ownership and credential changes if cleanup fails', async () => {
    const { owner, group } = await testScenario();
    await db.$executeRawUnsafe(
      `CREATE FUNCTION fail_account_cleanup() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test cleanup failure'; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER fail_account_cleanup BEFORE DELETE ON "PushNotification" FOR EACH STATEMENT EXECUTE FUNCTION fail_account_cleanup()`,
    );
    try {
      await expect(callerFor(owner.id).user.deleteAccount()).rejects.toThrow(
        'test cleanup failure',
      );
      expect(await db.user.findUniqueOrThrow({ where: { id: owner.id } })).toEqual(owner);
      expect(await db.group.findUniqueOrThrow({ where: { id: group.id } })).toMatchObject({
        userId: owner.id,
      });
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER fail_account_cleanup ON "PushNotification"');
      await db.$executeRawUnsafe('DROP FUNCTION fail_account_cleanup()');
    }
  });

  it('stops only recurrences created by the deleted account without changing existing expenses', async () => {
    const { owner, member, input } = await testScenario();
    await callerFor(owner.id).expense.addOrEditExpense({ ...input, cronExpression: '0 0 1 1 *' });
    await callerFor(member.id).expense.addOrEditExpense({ ...input, cronExpression: '0 12 1 1 *' });
    const before = await db.expense.findMany({
      select: { id: true, amount: true },
      orderBy: { id: 'asc' },
    });
    await callerFor(owner.id).user.deleteAccount();
    expect(await db.job.count()).toBe(1);
    expect(await db.expenseRecurrence.count()).toBe(1);
    expect(
      await db.expense.findMany({ select: { id: true, amount: true }, orderBy: { id: 'asc' } }),
    ).toEqual(before);
    expect(
      await db.expense.findFirstOrThrow({ where: { recurrenceId: { not: null } } }),
    ).toMatchObject({ addedBy: member.id });
  });

  it('allows multiple deleted accounts without conflicting email placeholders', async () => {
    const first = await testUser();
    const second = await testUser();
    await callerFor(first.id).user.deleteAccount();
    await callerFor(second.id).user.deleteAccount();
    expect(await db.user.count({ where: { deletedAt: { not: null }, email: null } })).toBe(2);
  });
});
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
