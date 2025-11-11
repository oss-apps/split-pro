CREATE VIEW
    "public"."BalanceView" AS
    -- Use a Common Table Expression (CTE) to calculate the "one-way" balances.
    -- This query is based on YOUR schema where `ep.amount < 0` is a debt.
WITH
    "BaseBalance" AS (
        SELECT
            CASE
                WHEN ep."userId" < e."paidBy" THEN ep."userId"
                ELSE e."paidBy"
            END AS "user_id_A", -- The person who owes (debtor)
            CASE
                WHEN ep."userId" < e."paidBy" THEN e."paidBy"
                ELSE ep."userId"
            END AS "user_id_B", -- The person who is owed (creditor)
            e."groupId",
            e.currency,
            SUM(
                ep."amount" * (
                    CASE
                        WHEN ep."userId" < e."paidBy"
                        -- A=participant, B=payer. A owes B. ep.amount is < 0. We need a NEGATIVE result.
                        THEN 1
                        -- B=participant, A=payer. B owes A. ep.amount is < 0. We need a POSITIVE result.
                        ELSE -1
                    END
                )
            ) AS "net_amount",
            MIN(e."createdAt") AS "createdAt",
            MAX(e."updatedAt") AS "updatedAt"
        FROM
            "public"."ExpenseParticipant" AS ep
            JOIN "public"."Expense" AS e ON ep."expenseId" = e."id"
        WHERE
            -- A user can't owe themselves
            ep."userId" != e."paidBy"
            AND e."deletedAt" IS NULL
        GROUP BY
            -- Note: We group by the original columns
            "user_id_A",
            "user_id_B",
            e."groupId",
            e.currency
    )
    -- Query 1: The debtor's perspective (e.g., User 5, Friend 10, Amount -100)
    -- This shows what "userId" owes to "friendId"
SELECT
    "user_id_A" AS "userId",
    "user_id_B" AS "friendId",
    "groupId",
    currency,
    "net_amount" AS amount,
    "createdAt",
    "updatedAt"
FROM
    "BaseBalance"
UNION ALL
-- Query 2: The creditor's perspective (e.g., User 10, Friend 5, Amount +100)
-- This shows what "userId" (the creditor) is owed by "friendId" (the debtor)
SELECT
    "user_id_B" AS "userId", -- Swapped
    "user_id_A" AS "friendId", -- Swapped
    "groupId",
    currency,
    -- Invert the sign to show a positive balance (is owed)
    - ("net_amount") AS amount,
    "createdAt",
    "updatedAt"
FROM
    "BaseBalance";

-- We may want to migrate this to a materialized view in the future for performance reasons.
-- CREATE UNIQUE INDEX ON "public"."BalanceView" ("userId", "friendId", "groupId", currency);
-- CREATE INDEX ON "public"."BalanceView" ("userId");