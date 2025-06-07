-- @param {Int} $1: id of the user
SELECT "Group"."id", "Group".name, Coalesce(sum("ExpenseParticipant".amount),0) as balance, Coalesce("Expense".currency, "Group"."defaultCurrency") as currency
FROM "GroupUser"
JOIN "Group" ON "GroupUser"."groupId" = "Group".id
LEFT JOIN "Expense" ON "Expense"."groupId" = "Group".id
LEFT JOIN "ExpenseParticipant" ON "Expense".id = "ExpenseParticipant"."expenseId"
WHERE "GroupUser"."userId" = $1 AND "deletedAt" IS NULL AND ("ExpenseParticipant"."userId" = $1 OR "Expense".id is null)
GROUP BY "Group".id, "Group".name, "Expense".currency