CREATE VIEW "public"."BalanceView" AS
SELECT
    -- To avoid duplicate rows (A owes B and B owes A), we consistently order
    -- the user IDs. The debt is always from the user with the smaller ID
    -- to the user with the larger ID. We adjust the amount accordingly.
    CASE WHEN "ExpenseParticipant"."userId" < "Expense"."paidBy" THEN "ExpenseParticipant"."userId" ELSE "Expense"."paidBy" END AS "userA_Id",
    CASE WHEN "ExpenseParticipant"."userId" < "Expense"."paidBy" THEN "Expense"."paidBy" ELSE "ExpenseParticipant"."userId" END AS "userB_Id",
    "Expense"."groupId",
    "Expense"."currency",
    -- The sum determines the net balance. A positive value means userB owes userA.
    -- A negative value means userA owes userB.
    SUM(
        CASE WHEN "ExpenseParticipant"."userId" < "Expense"."paidBy" THEN -("ExpenseParticipant"."amount") ELSE ("ExpenseParticipant"."amount") END
    ) as "amount"
FROM "public"."ExpenseParticipant"
JOIN "public"."Expense" ON "ExpenseParticipant"."expenseId" = "Expense"."id"
-- We only care about transactions between two different people.
WHERE "ExpenseParticipant"."userId" != "Expense"."paidBy" AND "Expense"."deletedAt" IS NULL
GROUP BY "userA_Id", "userB_Id", "Expense"."groupId", "Expense"."currency"
-- We can filter out settled debts.
HAVING SUM(
        CASE WHEN "ExpenseParticipant"."userId" < "Expense"."paidBy" THEN -("ExpenseParticipant"."amount") ELSE ("ExpenseParticipant"."amount") END
) != 0;

-- We may want to migrate this to a materialized view in the future for performance reasons.
-- CREATE UNIQUE INDEX ON "public"."BalanceView" ("userA_Id", "userB_Id", "groupId", "currency");
-- CREATE INDEX ON "public"."BalanceView" ("userA_Id");
-- CREATE INDEX ON "public"."BalanceView" ("userB_Id");
