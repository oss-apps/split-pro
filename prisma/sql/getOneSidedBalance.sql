-- @param {Int} $1:paidByUserId
-- @param {Int} $2:userId
-- @param {Int} $3:groupId?
SELECT
    SUM(ep_user.amount)::bigint AS amount,
    e.currency
FROM
    "Expense" as e
    INNER JOIN "ExpenseParticipant" AS ep_user ON (
        e.id = ep_user."expenseId"
        AND ep_user."userId" = $2
    )
WHERE
    (e."groupId" = $3 OR (e."groupId" IS NULL AND $3 IS NULL))
    AND e."deletedAt" IS NULL
    AND e."paidBy" = $1
GROUP BY
    e.currency