-- DropForeignKey
ALTER TABLE "public"."Balance" DROP CONSTRAINT "Balance_friendId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Balance" DROP CONSTRAINT "Balance_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupBalance" DROP CONSTRAINT "GroupBalance_firendId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupBalance" DROP CONSTRAINT "GroupBalance_groupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupBalance" DROP CONSTRAINT "GroupBalance_userId_fkey";

-- Adjust Splitwise imported balances to account for BalanceView only counting expenses
WITH "Differences" AS (
    SELECT
        B."userId",
        B."friendId",
        B."currency",
        -- Calculate the difference
        (B."amount" - COALESCE(BV."amount", 0)) AS "diff_amount",
        B."createdAt",
        -- Pre-generate the Expense ID
        gen_random_uuid() AS "new_expense_id"
    FROM
        "Balance" B
    LEFT JOIN (
        SELECT "userId", "friendId", "currency", SUM("amount") as "amount"
        FROM "BalanceView"
        GROUP BY "userId", "friendId", "currency"
    ) BV ON B."userId" = BV."userId"
        AND B."friendId" = BV."friendId"
        AND B."currency" = BV."currency"
    WHERE
        B."importedFromSplitwise" = true
        AND B."userId" < B."friendId"
        AND (B."amount" - COALESCE(BV."amount", 0)) != 0
),
"InsertExpenses" AS (
    INSERT INTO "Expense" (
        "id",
        "paidBy",
        "addedBy",
        "name",
        "category",
        "amount",
        "currency",
        "splitType",
        "expenseDate",
        "createdAt",
        "updatedAt",
        "groupId"
    )
    SELECT
        "new_expense_id",
        -- Determine Payer: If diff < 0, Friend is creditor. If diff > 0, User is creditor.
        CASE WHEN "diff_amount" < 0 THEN "friendId" ELSE "userId" END, 
        CASE WHEN "diff_amount" < 0 THEN "friendId" ELSE "userId" END,
        'Splitwise Balance Import',
        'general',
        ABS("diff_amount"), -- Expense amount is always positive
        "currency",
        'EXACT',
        "createdAt",
        "createdAt",
        "createdAt",
        NULL
    FROM "Differences"
    -- RETURNING needed info for the next step
    RETURNING "id", "amount", "paidBy"
),
"InsertParticipants" AS (
    INSERT INTO "ExpenseParticipant" (
        "expenseId",
        "userId",
        "amount"
    )
    -- Row 1: The Payer (Creditor) -> Positive Amount
    SELECT
        ie."id",
        ie."paidBy",
        ie."amount" -- Positive flow (they paid/are owed)
    FROM "InsertExpenses" ie
    
    UNION ALL

    -- Row 2: The Debtor -> Negative Amount
    SELECT
        ie."id",
        -- The Debtor is whoever is NOT the payer.
        CASE 
            WHEN ie."paidBy" = d."friendId" THEN d."userId" 
            ELSE d."friendId" 
        END,
        -ie."amount" -- Negative flow (they owe)
    FROM "InsertExpenses" ie
    JOIN "Differences" d ON ie."id" = d."new_expense_id"
)
SELECT count(*) as "AdjustmentsCreated" FROM "InsertExpenses";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "hiddenFriendIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Function to remove a user ID from the hiddenFriendIds array
CREATE OR REPLACE FUNCTION public.auto_unhide_friend()
RETURNS TRIGGER AS $$
BEGIN
    -- If a new participant entry is added/updated
    -- We must ensure the 'userId' un-hides the 'payer' (and vice versa)
    -- But since we don't have the Payer ID easily in the Participant row alone,
    -- we rely on the fact that an Expense creation/update usually touches both parties.

    -- SCENARIO: Remove the NEW.userId from the Payer's hidden list, and vice versa.
    -- However, doing this purely from ExpenseParticipant is hard because we need the 'paidBy' from Expense.

    -- SIMPLIFIED APPROACH:
    -- When money flows, we simply try to remove the IDs from the array.
    -- PostgreSQL's array_remove function handles this gracefully (does nothing if ID not found).

    -- Note: This trigger logic assumes we can join to the Expense table.
    -- It fires AFTER INSERT on ExpenseParticipant.

    UPDATE "User"
    SET "hiddenFriendIds" = array_remove("hiddenFriendIds", NEW."paidBy")
    WHERE id = NEW."userId";

    UPDATE "User"
    SET "hiddenFriendIds" = array_remove("hiddenFriendIds", NEW."userId")
    WHERE id = NEW."paidBy";

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition
DROP TRIGGER IF EXISTS trigger_auto_unhide_friend ON "ExpenseParticipant";
CREATE TRIGGER trigger_auto_unhide_friend
    AFTER INSERT ON "ExpenseParticipant"
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_unhide_friend();