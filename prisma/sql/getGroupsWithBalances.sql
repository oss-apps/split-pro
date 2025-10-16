-- @param {Int} $1:id of the user
SELECT
    "Group"."id",
    "Group".name,
    CAST(Coalesce(sum("ExpenseParticipant".amount), 0) AS BIGINT) AS balance,
    Coalesce("Expense".currency, "Group"."defaultCurrency") AS currency,
    "Group"."archivedAt"
FROM
    "GroupUser"
    JOIN "Group" ON "GroupUser"."groupId" = "Group".id
    LEFT JOIN "Expense" ON "Expense"."groupId" = "Group".id
    LEFT JOIN "ExpenseParticipant" ON "Expense".id = "ExpenseParticipant"."expenseId"
WHERE
    "GroupUser"."userId" = $1
    AND "deletedAt" IS NULL
    AND ("ExpenseParticipant"."userId" = $1
        OR "Expense".id IS NULL)
GROUP BY
    "Group".id,
    "Group".name,
    "Expense".currency
ORDER BY
    "Group"."createdAt" DESC,
    balance DESC
