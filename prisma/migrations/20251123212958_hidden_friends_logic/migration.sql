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
    SET "hiddenFriendIds" = array_remove("hiddenFriendIds", (SELECT "paidBy" FROM "Expense" WHERE id = NEW."expenseId"))
    WHERE id = NEW."userId";

    UPDATE "User"
    SET "hiddenFriendIds" = array_remove("hiddenFriendIds", NEW."userId")
    WHERE id = (SELECT "paidBy" FROM "Expense" WHERE id = NEW."expenseId");

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition
DROP TRIGGER IF EXISTS trigger_auto_unhide_friend ON "ExpenseParticipant";
CREATE TRIGGER trigger_auto_unhide_friend
    AFTER INSERT ON "ExpenseParticipant"
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_unhide_friend();