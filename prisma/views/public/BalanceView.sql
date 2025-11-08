WITH participant_flows AS (
  SELECT
    e."groupId",
    e.currency,
    ep."userId",
    ep.amount
  FROM
    (
      "Expense" e
      JOIN "ExpenseParticipant" ep ON ((e.id = ep."expenseId"))
    )
  WHERE
    (e."deletedAt" IS NULL)
),
cross_user_flows AS (
  SELECT
    p1."groupId",
    p1.currency,
    p1."userId",
    p2."userId" AS "friendId",
    p1.amount
  FROM
    (
      participant_flows p1
      JOIN participant_flows p2 ON (
        (
          (
            NOT (
              p1."groupId" IS DISTINCT
              FROM
                p2."groupId"
            )
          )
          AND (p1.currency = p2.currency)
          AND (p1."userId" <> p2."userId")
        )
      )
    )
)
SELECT
  "groupId",
  currency,
  "userId",
  "friendId",
  (sum(amount)) :: bigint AS amount,
  NOW() AS "createdAt",
  NOW() AS "updatedAt",
  false AS "importedFromSplitwise"
FROM
  cross_user_flows
GROUP BY
  "groupId",
  currency,
  "userId",
  "friendId"
HAVING
  (sum(amount) <> (0) :: numeric);