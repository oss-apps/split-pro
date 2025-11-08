SELECT
  CASE
    WHEN (
      "ExpenseParticipant"."userId" < "Expense"."paidBy"
    ) THEN "ExpenseParticipant"."userId"
    ELSE "Expense"."paidBy"
  END AS "userA_Id",
  CASE
    WHEN (
      "ExpenseParticipant"."userId" < "Expense"."paidBy"
    ) THEN "Expense"."paidBy"
    ELSE "ExpenseParticipant"."userId"
  END AS "userB_Id",
  "Expense"."groupId",
  "Expense".currency,
  (
    sum(
      CASE
        WHEN (
          "ExpenseParticipant"."userId" < "Expense"."paidBy"
        ) THEN (- "ExpenseParticipant".amount)
        ELSE "ExpenseParticipant".amount
      END
    )
  ) :: bigint AS amount
FROM
  (
    "ExpenseParticipant"
    JOIN "Expense" ON (
      ("ExpenseParticipant"."expenseId" = "Expense".id)
    )
  )
WHERE
  (
    (
      "ExpenseParticipant"."userId" <> "Expense"."paidBy"
    )
    AND ("Expense"."deletedAt" IS NULL)
  )
GROUP BY
  CASE
    WHEN (
      "ExpenseParticipant"."userId" < "Expense"."paidBy"
    ) THEN "ExpenseParticipant"."userId"
    ELSE "Expense"."paidBy"
  END,
  CASE
    WHEN (
      "ExpenseParticipant"."userId" < "Expense"."paidBy"
    ) THEN "Expense"."paidBy"
    ELSE "ExpenseParticipant"."userId"
  END,
  "Expense"."groupId",
  "Expense".currency
HAVING
  (
    sum(
      CASE
        WHEN (
          "ExpenseParticipant"."userId" < "Expense"."paidBy"
        ) THEN (- "ExpenseParticipant".amount)
        ELSE "ExpenseParticipant".amount
      END
    ) <> (0) :: numeric
  );