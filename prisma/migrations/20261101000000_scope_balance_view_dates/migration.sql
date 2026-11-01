-- Filter before aggregation. Missing transaction-local bounds mean all history.
CREATE OR REPLACE VIEW public."BalanceView" AS
WITH "BaseBalance" AS (
  SELECT
    CASE
      WHEN (ep."userId" < e."paidBy") THEN ep."userId"
      ELSE e."paidBy"
    END AS "user_id_A",
    CASE
      WHEN (ep."userId" < e."paidBy") THEN e."paidBy"
      ELSE ep."userId"
    END AS "user_id_B",
    e."groupId",
    e.currency,
    sum(
      (
        ep.amount * CASE
          WHEN (ep."userId" < e."paidBy") THEN 1
          ELSE '-1' :: integer
        END
      )
    ) AS net_amount,
    min(e."createdAt") AS "createdAt",
    max(e."updatedAt") AS "updatedAt"
  FROM
    (
      "ExpenseParticipant" ep
      JOIN "Expense" e ON ((ep."expenseId" = e.id))
    )
  WHERE
    (
      (ep."userId" <> e."paidBy")
      AND (e."deletedAt" IS NULL)
      AND (e."expenseDate" >= COALESCE(NULLIF(current_setting('splitpro.balance_from', true), '')::timestamptz AT TIME ZONE 'UTC', '-infinity'::timestamp))
      AND (e."expenseDate" < COALESCE(NULLIF(current_setting('splitpro.balance_to', true), '')::timestamptz AT TIME ZONE 'UTC', 'infinity'::timestamp))
    )
  GROUP BY
    CASE
      WHEN (ep."userId" < e."paidBy") THEN ep."userId"
      ELSE e."paidBy"
    END,
    CASE
      WHEN (ep."userId" < e."paidBy") THEN e."paidBy"
      ELSE ep."userId"
    END,
    e."groupId",
    e.currency
)
SELECT
  "BaseBalance"."user_id_A" AS "userId",
  "BaseBalance"."user_id_B" AS "friendId",
  "BaseBalance"."groupId",
  "BaseBalance".currency,
  "BaseBalance".net_amount AS amount,
  "BaseBalance"."createdAt",
  "BaseBalance"."updatedAt"
FROM
  "BaseBalance"
UNION
ALL
SELECT
  "BaseBalance"."user_id_B" AS "userId",
  "BaseBalance"."user_id_A" AS "friendId",
  "BaseBalance"."groupId",
  "BaseBalance".currency,
  (- "BaseBalance".net_amount) AS amount,
  "BaseBalance"."createdAt",
  "BaseBalance"."updatedAt"
FROM
  "BaseBalance";