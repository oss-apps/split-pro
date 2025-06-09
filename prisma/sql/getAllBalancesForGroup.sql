-- @param {Int} $1:id of the group
select "groupId", "userId" as "borrowedBy", "paidBy", "currency", Coalesce(-1 * sum("ExpenseParticipant".amount),0) as amount FROM "Expense"
JOIN "ExpenseParticipant" ON "ExpenseParticipant"."expenseId" = "Expense".id
WhERE "groupId" = $1 AND "userId" != "paidBy"
GROUP BY "userId", "paidBy", "currency", "groupId"
ORDER By "currency"