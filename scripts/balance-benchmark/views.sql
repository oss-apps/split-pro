-- All objects are session-local. The runner rolls the transaction back.
-- Keep the simple UNION ALL variant separate from the single-scan LATERAL variant:
-- predicate pushdown can matter more than the number of written table scans.
CREATE TEMP VIEW bench_canonical AS
SELECT least(ep."userId", e."paidBy") AS "userA",
       greatest(ep."userId", e."paidBy") AS "userB",
       e."groupId", e.currency, e."expenseDate", e."createdAt", e."updatedAt",
       ep.amount * CASE WHEN ep."userId" < e."paidBy" THEN 1 ELSE -1 END AS amount
FROM public."ExpenseParticipant" ep
JOIN public."Expense" e ON e.id = ep."expenseId"
WHERE ep."userId" <> e."paidBy" AND e."deletedAt" IS NULL;

CREATE TEMP VIEW bench_entries AS
SELECT ep."userId", e."paidBy" AS "friendId", e."groupId", e.currency,
       ep.amount, e."expenseDate", e."createdAt", e."updatedAt"
FROM public."ExpenseParticipant" ep
JOIN public."Expense" e ON e.id = ep."expenseId"
WHERE ep."userId" <> e."paidBy" AND e."deletedAt" IS NULL
UNION ALL
SELECT e."paidBy", ep."userId", e."groupId", e.currency,
       -ep.amount, e."expenseDate", e."createdAt", e."updatedAt"
FROM public."ExpenseParticipant" ep
JOIN public."Expense" e ON e.id = ep."expenseId"
WHERE ep."userId" <> e."paidBy" AND e."deletedAt" IS NULL;

CREATE TEMP VIEW bench_lateral_entries AS
SELECT p."userId", p."friendId", e."groupId", e.currency,
       p.amount, e."expenseDate", e."createdAt", e."updatedAt"
FROM public."ExpenseParticipant" ep
JOIN public."Expense" e ON e.id = ep."expenseId"
CROSS JOIN LATERAL (VALUES
  (ep."userId", e."paidBy", ep.amount),
  (e."paidBy", ep."userId", -ep.amount)
) AS p("userId", "friendId", amount)
WHERE ep."userId" <> e."paidBy" AND e."deletedAt" IS NULL;

-- One row per pair/group/currency/timestamp rather than one per expense.
CREATE TEMP VIEW bench_dated AS
SELECT "userId", "friendId", "groupId", currency, "expenseDate",
       sum(amount)::bigint AS amount,
       min("createdAt") AS "createdAt", max("updatedAt") AS "updatedAt"
FROM bench_entries
GROUP BY "userId", "friendId", "groupId", currency, "expenseDate";

-- Snapshot intervals retain findMany/include-shaped access. Their cost is measured,
-- not assumed: window aggregation can prevent the date cutoff reaching table scans.
CREATE TEMP VIEW bench_intervals AS
SELECT "userId", "friendId", "groupId", currency,
       "expenseDate" AS "validFrom",
       lead("expenseDate") OVER balances AS "validTo",
       (sum(amount) OVER balances)::bigint AS amount,
       min("createdAt") OVER balances AS "createdAt",
       max("updatedAt") OVER balances AS "updatedAt"
FROM bench_dated
WINDOW balances AS (
  PARTITION BY "userId", "friendId", "groupId", currency
  ORDER BY "expenseDate" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
);
