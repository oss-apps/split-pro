-- @param {Int} $1:id of the group
SELECT
    "groupId",
    "userId" AS "borrowedBy",
    "paidBy",
    "currency",
    CAST(Coalesce(-1 * sum("ExpenseParticipant".amount), 0) AS BIGINT) AS amount
FROM
    "Expense"
    JOIN "ExpenseParticipant" ON "ExpenseParticipant"."expenseId" = "Expense".id
WHERE
    "groupId" = $1
    AND "userId" != "paidBy"
    AND "Expense"."deletedAt" IS NULL
GROUP BY
    "userId",
    "paidBy",
    "currency",
    "groupId"
ORDER BY
    "currency"
