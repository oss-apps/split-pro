-- @param {Int} $1:userId
SELECT
	DISTINCT E2."userId" AS "friendId"
FROM
	"ExpenseParticipant" E1
	INNER JOIN "ExpenseParticipant" E2 ON E1."expenseId" = E2."expenseId"
WHERE
	E1."userId" = $1
	AND E1."userId" != E2."userId"
