-- CreateTable
CREATE TABLE "AppMetadata" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppMetadata_pkey" PRIMARY KEY ("key")
);

-- CreateFunction: Historical balance calculation with date filter
-- Same logic as BalanceView but accepts a date parameter to calculate balances as of that date
CREATE OR REPLACE FUNCTION public.get_balance_at_date(before_date TIMESTAMP WITH TIME ZONE)
RETURNS TABLE (
    "userId" INT,
    "friendId" INT,
    "groupId" INT,
    currency TEXT,
    amount BIGINT,
    "createdAt" TIMESTAMP,
    "updatedAt" TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    WITH "BaseBalance" AS (
        SELECT
            CASE WHEN ep."userId" < e."paidBy" THEN ep."userId" ELSE e."paidBy" END AS "user_id_A",
            CASE WHEN ep."userId" < e."paidBy" THEN e."paidBy" ELSE ep."userId" END AS "user_id_B",
            e."groupId" AS grp_id,
            e.currency AS curr,
            SUM(
                ep."amount" * (
                    CASE WHEN ep."userId" < e."paidBy" THEN 1 ELSE -1 END
                )
            )::BIGINT AS "net_amount",
            MIN(e."createdAt") AS created,
            MAX(e."updatedAt") AS updated
        FROM "public"."ExpenseParticipant" AS ep
        JOIN "public"."Expense" AS e ON ep."expenseId" = e."id"
        WHERE 
            ep."userId" != e."paidBy"
            AND e."deletedAt" IS NULL
            AND e."createdAt" < before_date
        GROUP BY "user_id_A", "user_id_B", e."groupId", e.currency
    )
    -- Debtor's perspective
    SELECT "user_id_A", "user_id_B", grp_id, curr, "net_amount", created, updated
    FROM "BaseBalance"
    UNION ALL
    -- Creditor's perspective (mirrored)
    SELECT "user_id_B", "user_id_A", grp_id, curr, -"net_amount", created, updated
    FROM "BaseBalance";
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_balance_at_date IS 
'Returns balances as of a given date. Same logic as BalanceView but with date filtering.
Used for settlement migration and historical balance queries.';
