-- @param {Int} $1: id of the user
SELECT "Group"."id", "Group".name, sum("ExpenseParticipant".amount), "Expense".currency
FROM "GroupUser"
JOIN "Group" ON "GroupUser"."groupId" = "Group".id
JOIN "Expense" ON "Expense"."groupId" = "Group".id
JOIN "ExpenseParticipant" ON "Expense".id = "ExpenseParticipant"."expenseId"
WHERE "GroupUser"."userId" = $1 AND "deletedAt" IS NULL AND "ExpenseParticipant"."userId" = $1
GROUP BY "Group".id, "Group".name, "Expense".currency