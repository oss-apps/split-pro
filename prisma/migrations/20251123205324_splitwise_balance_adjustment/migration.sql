WITH "Differences" AS (
    SELECT
        B."userId",
        B."friendId",
        B."currency",
        -- Calculate the difference
        (B."amount" - COALESCE(BV."amount", 0)) AS "diff_amount",
        B."createdAt",
        -- Pre-generate the Expense ID
        gen_random_uuid() AS "new_expense_id"
    FROM
        "Balance" B
    LEFT JOIN (
        SELECT "userId", "friendId", "currency", SUM("amount") as "amount"
        FROM "BalanceView"
        GROUP BY "userId", "friendId", "currency"
    ) BV ON B."userId" = BV."userId"
        AND B."friendId" = BV."friendId"
        AND B."currency" = BV."currency"
    WHERE
        B."importedFromSplitwise" = true
        AND B."userId" < B."friendId"
        AND (B."amount" - COALESCE(BV."amount", 0)) != 0
),
"InsertExpenses" AS (
    INSERT INTO "Expense" (
        "id",
        "paidBy",
        "addedBy",
        "name",
        "category",
        "amount",
        "currency",
        "splitType",
        "expenseDate",
        "createdAt",
        "updatedAt",
        "groupId"
    )
    SELECT
        "new_expense_id",
        -- Determine Payer: If diff < 0, Friend is creditor. If diff > 0, User is creditor.
        CASE WHEN "diff_amount" < 0 THEN "friendId" ELSE "userId" END, 
        CASE WHEN "diff_amount" < 0 THEN "friendId" ELSE "userId" END,
        'Splitwise Balance Import',
        'general',
        ABS("diff_amount"), -- Expense amount is always positive
        "currency",
        'EXACT',
        "createdAt",
        "createdAt",
        "createdAt",
        NULL
    FROM "Differences"
    -- RETURNING needed info for the next step
    RETURNING "id", "amount", "paidBy"
),
"InsertParticipants" AS (
    INSERT INTO "ExpenseParticipant" (
        "expenseId",
        "userId",
        "amount"
    )
    -- Row 1: The Payer (Creditor) -> Positive Amount
    SELECT
        ie."id",
        ie."paidBy",
        ie."amount" -- Positive flow (they paid/are owed)
    FROM "InsertExpenses" ie
    
    UNION ALL

    -- Row 2: The Debtor -> Negative Amount
    SELECT
        ie."id",
        -- The Debtor is whoever is NOT the payer.
        CASE 
            WHEN ie."paidBy" = d."friendId" THEN d."userId" 
            ELSE d."friendId" 
        END,
        -ie."amount" -- Negative flow (they owe)
    FROM "InsertExpenses" ie
    JOIN "Differences" d ON ie."id" = d."new_expense_id"
)
SELECT count(*) as "AdjustmentsCreated" FROM "InsertExpenses";