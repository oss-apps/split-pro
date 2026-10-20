SELECT ep."expenseId", ep."userId", e."paidBy" AS "friendId", e."groupId",
       e.currency, ep.amount, e."expenseDate", e."createdAt", e."updatedAt"
FROM public."ExpenseParticipant" ep
JOIN public."Expense" e ON e.id = ep."expenseId"
WHERE ep."userId" <> e."paidBy" AND e."deletedAt" IS NULL
UNION ALL
SELECT ep."expenseId", e."paidBy", ep."userId", e."groupId",
       e.currency, -ep.amount, e."expenseDate", e."createdAt", e."updatedAt"
FROM public."ExpenseParticipant" ep
JOIN public."Expense" e ON e.id = ep."expenseId"
WHERE ep."userId" <> e."paidBy" AND e."deletedAt" IS NULL;
