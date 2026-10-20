import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { z } from 'zod';

// Avoid application initialization, seed generation, and startup migrations.
// The psql session owns all temporary views and measurements.
const { values } = parseArgs({
  options: {
    repetitions: { type: 'string', default: '9' },
    warmups: { type: 'string', default: '2' },
    output: { type: 'string' },
    'participant-index': { type: 'boolean', default: false },
    'date-index': { type: 'boolean', default: false },
    scale: { type: 'string', default: '1' },
    variants: { type: 'string' },
  },
});
const repetitions = Number(values.repetitions);
const warmups = Number(values.warmups);
const scale = Number(values.scale);
assert(Number.isInteger(repetitions) && 0 < repetitions && 100 >= repetitions);
assert(Number.isInteger(warmups) && 0 <= warmups && 10 >= warmups);
assert(Number.isInteger(scale) && 1 <= scale && 20 >= scale);
const selectedVariants = values.variants?.split(',');
const variants = [
  'original',
  'not-materialized',
  'canonical-reduce-first',
  'union-entries',
  'lateral-entries',
  'dated-aggregate',
  'intervals',
];
assert(
  selectedVariants?.every((variant) => variants.includes(variant)) ?? true,
  `Unknown variant; choose from ${variants.join(', ')}`,
);
const url = process.env.DATABASE_URL;
assert(url, 'Load DATABASE_URL, e.g. node --env-file=.env --import tsx ...');
assert(
  ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname),
  'Benchmarks require a local seeded database',
);

const psql = (sql: string) => {
  const result = spawnSync('psql', ['-X', '-qAt', '-d', url, '-v', 'ON_ERROR_STOP=1'], {
    input: sql,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (0 !== result.status) {
    throw new Error(result.stderr || result.error?.message || 'psql failed');
  }
  return result.stdout.trim();
};
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;

const metadataSchema = z.object({
  version: z.string(),
  expenses: z.number(),
  participants: z.number(),
  deleted: z.number(),
  future: z.number(),
  settings: z.record(z.string(), z.string()),
  indexes: z.array(z.string()),
  users: z.array(z.object({ id: z.number(), contributions: z.number() })),
  group: z.number(),
  pair: z.object({ userId: z.number(), friendId: z.number() }),
  midpoint: z.string(),
});

const metadata = metadataSchema.parse(
  JSON.parse(
    psql(`
    BEGIN READ ONLY;
    SELECT json_build_object(
      'version', version(),
      'expenses', (SELECT count(*) FROM "Expense"),
      'participants', (SELECT count(*) FROM "ExpenseParticipant"),
      'deleted', (SELECT count(*) FROM "Expense" WHERE "deletedAt" IS NOT NULL),
      'future', (SELECT count(*) FROM "Expense" WHERE "expenseDate" > CURRENT_TIMESTAMP),
      'settings', (SELECT json_object_agg(name, setting) FROM pg_settings WHERE name IN
        ('work_mem','shared_buffers','jit','max_parallel_workers_per_gather','TimeZone')),
      'indexes', (SELECT json_agg(indexdef ORDER BY indexname) FROM pg_indexes
        WHERE schemaname = 'public' AND tablename IN ('Expense','ExpenseParticipant')),
      'users', (SELECT json_agg(t) FROM (
        SELECT ep."userId" AS id, count(*) AS contributions
        FROM "ExpenseParticipant" ep JOIN "Expense" e ON e.id = ep."expenseId"
        WHERE ep."userId" <> e."paidBy" AND e."deletedAt" IS NULL
        GROUP BY ep."userId" ORDER BY count(*) DESC, ep."userId"
      ) t),
      'group', (SELECT "groupId" FROM "Expense" WHERE "groupId" IS NOT NULL
        GROUP BY "groupId" ORDER BY count(*) DESC, "groupId" LIMIT 1),
      'pair', (SELECT json_build_object('userId', ep."userId", 'friendId', e."paidBy")
        FROM "ExpenseParticipant" ep JOIN "Expense" e ON e.id = ep."expenseId"
        WHERE ep."userId" <> e."paidBy" AND e."deletedAt" IS NULL
        GROUP BY ep."userId", e."paidBy" ORDER BY count(*) DESC, ep."userId", e."paidBy" LIMIT 1),
      'midpoint', (SELECT percentile_disc(0.5) WITHIN GROUP (ORDER BY "expenseDate")::text
        FROM "Expense" WHERE "deletedAt" IS NULL)
    );
    ROLLBACK;
  `),
  ),
);
assert(metadata.users.length && metadata.pair && metadata.midpoint, 'Seed database first');

const sourceDefinitions = await readFile(new URL('./views.sql', import.meta.url), 'utf8');
const withBenchmarkTables = (sql: string) =>
  1 === scale
    ? sql
    : sql
        .replaceAll('public."ExpenseParticipant"', 'pg_temp.bench_scaled_participant')
        .replaceAll('public."Expense"', 'pg_temp.bench_scaled_expense');
const definitions = withBenchmarkTables(sourceDefinitions);
const original = (
  await readFile(new URL('../../prisma/views/public/BalanceView.sql', import.meta.url), 'utf8')
)
  .trim()
  .replace(/;$/, '');
assert(
  original.includes('(e."deletedAt" IS NULL)') && original.includes('WITH "BaseBalance" AS ('),
  'Update baseline predicate injection to match the current BalanceView definition',
);
const projection = '"userId", "friendId", "groupId", currency, amount, "createdAt", "updatedAt"';
const aggregate = (source: string, where: string) => `
  SELECT "userId", "friendId", "groupId", currency, sum(amount)::bigint AS amount,
         min("createdAt") AS "createdAt", max("updatedAt") AS "updatedAt"
  FROM ${source} WHERE ${where}
  GROUP BY "userId", "friendId", "groupId", currency`;

const scopes = [
  { name: 'all', where: 'true', canonical: 'true' },
  ...[
    { name: 'busy-user', user: metadata.users[0]! },
    { name: 'typical-user', user: metadata.users[Math.floor(metadata.users.length / 2)]! },
    { name: 'quiet-user', user: metadata.users.at(-1)! },
  ].map(({ name, user }) => {
    const id = user.id;
    return {
      name,
      where: `"userId" = ${id}`,
      canonical: `("userA" = ${id} OR "userB" = ${id})`,
    };
  }),
  {
    name: 'group',
    where: `"groupId" = ${metadata.group}`,
    canonical: `"groupId" = ${metadata.group}`,
  },
  {
    name: 'pair',
    where: `"userId" = ${metadata.pair.userId} AND "friendId" = ${metadata.pair.friendId}`,
    canonical: `"userA" = ${Math.min(metadata.pair.userId, metadata.pair.friendId)} AND "userB" = ${Math.max(metadata.pair.userId, metadata.pair.friendId)}`,
  },
];
const cutoff = `${quote(metadata.midpoint)}::timestamp`;
const ranges = [
  { name: 'all-time', where: 'true', end: `'infinity'::timestamp`, snapshot: true },
  { name: 'as-of', where: `"expenseDate" < ${cutoff}`, end: cutoff, snapshot: true },
  {
    name: 'month',
    where: `"expenseDate" >= ${cutoff} - interval '30 days' AND "expenseDate" < ${cutoff}`,
    end: cutoff,
    snapshot: false,
  },
];

const statements: string[] = [
  'BEGIN ISOLATION LEVEL REPEATABLE READ;',
  "SET LOCAL statement_timeout = '10min';",
  ...(1 < scale
    ? [
        `
    CREATE TEMP TABLE bench_scaled_expense (LIKE public."Expense" INCLUDING ALL);
    CREATE TEMP TABLE bench_scaled_participant (LIKE public."ExpenseParticipant" INCLUDING ALL);
    INSERT INTO bench_scaled_expense
    SELECT clone.* FROM public."Expense" e CROSS JOIN generate_series(1, ${scale}) copy
    CROSS JOIN LATERAL jsonb_populate_record(NULL::public."Expense", to_jsonb(e) ||
      jsonb_build_object('id', md5(e.id::text || ':' || copy)::uuid, 'conversionToId', NULL)) clone;
    INSERT INTO bench_scaled_participant ("expenseId", "userId", amount)
    SELECT md5(ep."expenseId"::text || ':' || copy)::uuid, ep."userId", ep.amount
    FROM public."ExpenseParticipant" ep CROSS JOIN generate_series(1, ${scale}) copy;
    ANALYZE bench_scaled_expense;
    ANALYZE bench_scaled_participant;
  `,
      ]
    : []),
  definitions,
  // Optional index experimentation is transactional and leaves no permanent index.
  ...(values['participant-index']
    ? [
        withBenchmarkTables(
          'CREATE INDEX balance_benchmark_participant_user_idx ON public."ExpenseParticipant" ("userId", "expenseId") INCLUDE (amount);',
        ),
      ]
    : []),
  ...(values['date-index']
    ? [
        withBenchmarkTables(
          'CREATE INDEX balance_benchmark_expense_date_idx ON public."Expense" ("expenseDate") WHERE "deletedAt" IS NULL;',
        ),
      ]
    : []),
  `CREATE TEMP TABLE bench_jobs (workload text, variant text, query text);`,
  `CREATE TEMP TABLE bench_results (workload text, variant text, trial int, plan jsonb);`,
  `CREATE TEMP TABLE bench_checks (name text, passed boolean);`,
];

const addCheck = (name: string, left: string, right: string) => {
  statements.push(`
    DO $check$ BEGIN
      IF EXISTS (((${left}) EXCEPT ALL (${right})) UNION ALL ((${right}) EXCEPT ALL (${left}))) THEN
        RAISE EXCEPTION 'Correctness comparison failed: %', ${quote(name)};
      END IF;
    END $check$;
    INSERT INTO bench_checks VALUES (${quote(name)}, true);
  `);
};

ranges.forEach((range, index) => {
  // Put the date predicate inside the original reduction for a fair dated baseline.
  const datedOriginal = withBenchmarkTables(
    original
      .replaceAll('"ExpenseParticipant"', 'public."ExpenseParticipant"')
      .replaceAll('"Expense"', 'public."Expense"'),
  ).replace(
    '(e."deletedAt" IS NULL)',
    `(e."deletedAt" IS NULL) AND (${range.where.replaceAll('"expenseDate"', 'e."expenseDate"')})`,
  );
  statements.push(`CREATE TEMP VIEW bench_original_${index} AS ${datedOriginal};`);
  statements.push(
    `CREATE TEMP VIEW bench_not_materialized_${index} AS ${datedOriginal.replace('AS (', 'AS NOT MATERIALIZED (')};`,
  );
  scopes.forEach((scope) => {
    const workload = `${scope.name}/${range.name}`;
    const reference = `SELECT ${projection} FROM bench_original_${index} WHERE ${scope.where}`;
    const canonical = `
      SELECT p."userId", p."friendId", b."groupId", b.currency, p.amount, b."createdAt", b."updatedAt"
      FROM (
        SELECT "userA", "userB", "groupId", currency, sum(amount)::bigint AS amount,
               min("createdAt") AS "createdAt", max("updatedAt") AS "updatedAt"
        FROM bench_canonical WHERE (${range.where}) AND (${scope.canonical})
        GROUP BY "userA", "userB", "groupId", currency
      ) b CROSS JOIN LATERAL (VALUES (b."userA", b."userB", b.amount), (b."userB", b."userA", -b.amount))
        p("userId", "friendId", amount)
      WHERE ${scope.where}`;
    const queries: Record<string, string> = {
      original: reference,
      'not-materialized': `SELECT ${projection} FROM bench_not_materialized_${index} WHERE ${scope.where}`,
      'canonical-reduce-first': canonical,
      'union-entries': aggregate('bench_entries', `(${scope.where}) AND (${range.where})`),
      'lateral-entries': aggregate(
        'bench_lateral_entries',
        `(${scope.where}) AND (${range.where})`,
      ),
      'dated-aggregate': aggregate('bench_dated', `(${scope.where}) AND (${range.where})`),
      ...(range.snapshot
        ? {
            intervals: `SELECT ${projection} FROM bench_intervals WHERE (${scope.where})
          AND "validFrom" < ${range.end} AND ("validTo" >= ${range.end} OR "validTo" IS NULL)`,
          }
        : {}),
    };
    Object.entries(queries).forEach(([variant, query]) => {
      if ('original' !== variant) {
        addCheck(`${workload}/${variant}`, query, reference);
      }
      if (selectedVariants && !selectedVariants.includes(variant)) {
        return;
      }
      statements.push(
        `INSERT INTO bench_jobs VALUES (${quote(workload)}, ${quote(variant)}, ${quote(query)});`,
      );
    });
  });
});
if (1 === scale) {
  addCheck(
    'existing-view/all-time',
    'SELECT * FROM bench_original_0',
    'SELECT * FROM public."BalanceView"',
  );
}

// Assert exact fixture values independently of the reference implementation.
// Cover opposite payments, negative amounts, self/zero shares, deletion and ties.
statements.push(`
  CREATE TEMP TABLE fixture_expense (id int, "paidBy" int, "groupId" int, currency text,
    "expenseDate" timestamp, "createdAt" timestamp, "updatedAt" timestamp, "deletedAt" timestamp);
  CREATE TEMP TABLE fixture_participant ("expenseId" int, "userId" int, amount bigint);
  INSERT INTO fixture_expense VALUES
    (1,1,NULL,'USD','2025-01-01','2025-01-01','2025-01-01',NULL),
    (2,2,NULL,'USD','2025-02-01','2025-01-01','2025-02-02',NULL),
    (3,1,NULL,'USD','2025-03-01','2025-01-01','2025-01-01',NULL),
    (4,1,NULL,'USD','2025-01-01','2025-01-01','2025-01-01','2025-01-02'),
    (5,1,7,'EUR','2025-01-01','2025-01-01','2025-01-01',NULL),
    (6,1,NULL,'USD','2025-02-01','2025-01-01','2025-02-03',NULL);
  INSERT INTO fixture_participant VALUES
    (1,1,100),(1,2,-100),(1,3,0),(2,1,-30),(3,2,-500),
    (4,2,-9999),(5,2,-70),(6,2,10);
  ${sourceDefinitions.replaceAll('bench_', 'fixture_').replaceAll('public."ExpenseParticipant"', 'fixture_participant').replaceAll('public."Expense"', 'fixture_expense')}
`);
const fixtureProjection = '"userId", "friendId", "groupId", currency, amount';
const fixtureExpected = `SELECT * FROM (VALUES
  (1,2,NULL::int,'USD',60::bigint),(2,1,NULL::int,'USD',-60::bigint),
  (1,3,NULL::int,'USD',0::bigint),(3,1,NULL::int,'USD',0::bigint),
  (1,2,7,'EUR',70::bigint),(2,1,7,'EUR',-70::bigint)
) t("userId","friendId","groupId",currency,amount)`;
['fixture_entries', 'fixture_lateral_entries', 'fixture_dated'].forEach((source) => {
  addCheck(
    `fixture/${source}`,
    `SELECT ${fixtureProjection} FROM (${aggregate(source, `"expenseDate" < '2025-03-01'::timestamp`)}) b`,
    fixtureExpected,
  );
});
addCheck(
  'fixture/intervals',
  `SELECT ${fixtureProjection} FROM fixture_intervals
  WHERE "validFrom" < '2025-03-01' AND ("validTo" >= '2025-03-01' OR "validTo" IS NULL)`,
  fixtureExpected,
);
addCheck(
  'fixture/inclusive-start-exclusive-end',
  `SELECT ${fixtureProjection} FROM (${aggregate('fixture_entries', `"expenseDate" >= '2025-02-01' AND "expenseDate" < '2025-03-01'`)}) b`,
  `SELECT * FROM (VALUES (1,2,NULL::int,'USD',-40::bigint),(2,1,NULL::int,'USD',40::bigint))
    t("userId","friendId","groupId",currency,amount)`,
);
statements.push(`
  INSERT INTO fixture_expense VALUES
    (10,1,NULL,'JPY','2025-03-09 04:59:59.999','2025-01-01','2025-01-01',NULL),
    (11,1,NULL,'JPY','2025-03-09 05:00:00','2025-01-01','2025-01-01',NULL),
    (12,1,NULL,'JPY','2025-03-10 03:59:59.999','2025-01-01','2025-01-01',NULL),
    (13,1,NULL,'JPY','2025-03-10 04:00:00','2025-01-01','2025-01-01',NULL),
    (14,1,NULL,'BHD','2025-01-01','2025-01-01','2025-01-01',NULL);
  INSERT INTO fixture_participant VALUES
    (10,2,-100),(11,2,-200),(12,2,-300),(13,2,-400),(14,2,-9007199254740993);
`);
addCheck(
  'fixture/user-timezone-23-hour-day',
  `SELECT ${fixtureProjection} FROM (${aggregate(
    'fixture_entries',
    `currency = 'JPY'
    AND "expenseDate" >= (timestamp '2025-03-09' AT TIME ZONE 'America/New_York' AT TIME ZONE 'UTC')
    AND "expenseDate" < (timestamp '2025-03-10' AT TIME ZONE 'America/New_York' AT TIME ZONE 'UTC')`,
  )}) b`,
  `SELECT * FROM (VALUES (1,2,NULL::int,'JPY',500::bigint),(2,1,NULL::int,'JPY',-500::bigint))
    t("userId","friendId","groupId",currency,amount)`,
);
addCheck(
  'fixture/user-timezone-25-hour-day',
  `SELECT (timestamp '2025-11-03' AT TIME ZONE 'America/New_York') -
          (timestamp '2025-11-02' AT TIME ZONE 'America/New_York')`,
  `SELECT interval '25 hours'`,
);
addCheck(
  'fixture/bigint-precision',
  `SELECT ${fixtureProjection} FROM (${aggregate('fixture_entries', `currency = 'BHD'`)}) b`,
  `SELECT * FROM (VALUES (1,2,NULL::int,'BHD',9007199254740993::bigint),(2,1,NULL::int,'BHD',-9007199254740993::bigint))
    t("userId","friendId","groupId",currency,amount)`,
);

// Mix variant order deterministically each round to reduce order-related bias.
statements.push(`
  DO $benchmark$
  DECLARE job record; trial int; explained jsonb;
  BEGIN
    FOR trial IN ${1 - warmups}..${repetitions} LOOP
      FOR job IN SELECT * FROM bench_jobs ORDER BY md5(workload || variant || trial::text) LOOP
        EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, FORMAT JSON) ' || job.query INTO explained;
        IF trial > 0 THEN
          INSERT INTO bench_results VALUES (job.workload, job.variant, trial, explained->0);
        END IF;
      END LOOP;
    END LOOP;
  END $benchmark$;
  SELECT json_build_object(
    'checks', (SELECT count(*) FROM bench_checks),
    'measurements', (SELECT json_agg(t ORDER BY workload, variant, trial) FROM bench_results t)
  );
  ROLLBACK;
`);

console.info(
  `Benchmarking ${metadata.expenses * scale} expenses / ${metadata.participants * scale} participant rows; ${warmups} warmups + ${repetitions} trials.`,
);
const result = z
  .object({
    checks: z.number(),
    measurements: z.array(
      z.object({
        workload: z.string(),
        variant: z.string(),
        trial: z.number(),
        plan: z
          .object({
            'Execution Time': z.number(),
            'Planning Time': z.number(),
            Plan: z
              .object({
                'Shared Hit Blocks': z.number(),
                'Shared Read Blocks': z.number(),
                'Temp Written Blocks': z.number(),
                'Actual Rows': z.number(),
                'Local Hit Blocks': z.number().default(0),
                'Local Read Blocks': z.number().default(0),
              })
              .passthrough(),
          })
          .passthrough(),
      }),
    ),
  })
  .parse(JSON.parse(psql(statements.join('\n'))));
const median = (numbers: number[]) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return 0 === sorted.length % 2 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
};
const groups = new Map<string, typeof result.measurements>();
result.measurements.forEach((row) => {
  const key = `${row.workload}|${row.variant}`;
  const group = groups.get(key) ?? [];
  group.push(row);
  groups.set(key, group);
});
const summary = [...groups.values()].map((rows) => ({
  workload: rows[0]!.workload,
  variant: rows[0]!.variant,
  executionMs: median(rows.map((r) => r.plan['Execution Time'])),
  planningMs: median(rows.map((r) => r.plan['Planning Time'])),
  sharedHits: median(rows.map((r) => r.plan.Plan['Shared Hit Blocks'])),
  sharedReads: median(rows.map((r) => r.plan.Plan['Shared Read Blocks'])),
  localHits: median(rows.map((r) => r.plan.Plan['Local Hit Blocks'])),
  localReads: median(rows.map((r) => r.plan.Plan['Local Read Blocks'])),
  tempWritten: median(rows.map((r) => r.plan.Plan['Temp Written Blocks'])),
  rows: rows[0]!.plan.Plan['Actual Rows'],
}));
console.info(`${result.checks} correctness comparisons passed.`);
console.table(summary);
if (values.output) {
  await writeFile(
    values.output,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        options: {
          repetitions,
          warmups,
          scale,
          variants: values.variants,
          participantIndex: values['participant-index'],
          dateIndex: values['date-index'],
        },
        metadata,
        checks: result.checks,
        summary,
        measurements: result.measurements,
      },
      null,
      2,
    )}\n`,
  );
  console.info(`Full plans and results: ${values.output}`);
}
