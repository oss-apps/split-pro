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
DECLARE
    payer_id INT;
BEGIN
    SELECT "paidBy" INTO payer_id FROM "Expense" WHERE id = NEW."expenseId";

    -- ONLY update if the array actually contains the ID.
    -- This prevents locking the row if the friend is already visible (which is 99% of cases).
    
    UPDATE "User"
    SET "hiddenFriendIds" = array_remove("hiddenFriendIds", payer_id)
    WHERE id = NEW."userId" 
    AND "hiddenFriendIds" @> ARRAY[payer_id]; -- Only if array contains payer_id

    UPDATE "User"
    SET "hiddenFriendIds" = array_remove("hiddenFriendIds", NEW."userId")
    WHERE id = payer_id
    AND "hiddenFriendIds" @> ARRAY[NEW."userId"]; -- Only if array contains userId

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition
DROP TRIGGER IF EXISTS trigger_auto_unhide_friend ON "ExpenseParticipant";
CREATE TRIGGER trigger_auto_unhide_friend
    AFTER INSERT ON "ExpenseParticipant"
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_unhide_friend();