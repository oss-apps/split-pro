-- Create unified BalanceView that calculates balances from expenses
-- This replaces the Balance and GroupBalance tables' read operations

CREATE OR REPLACE VIEW "public"."BalanceView" AS
WITH participant_flows AS (
  -- Get all expense participant flows
  SELECT 
    e."groupId",
    e.currency,
    ep."userId",
    ep.amount
  FROM "public"."Expense" e
  JOIN "public"."ExpenseParticipant" ep ON e.id = ep."expenseId"
  WHERE e."deletedAt" IS NULL
),
cross_user_flows AS (
  -- For each expense, create flows between all participant pairs
  -- User A's flow with User B = sum of all A's amounts in expenses involving B
  SELECT
    p1."groupId",
    p1.currency,
    p1."userId",
    p2."userId" as "friendId",
    p1.amount
  FROM participant_flows p1
  JOIN participant_flows p2 ON 
    p1."groupId" IS NOT DISTINCT FROM p2."groupId"
    AND p1.currency = p2.currency
    AND p1."userId" != p2."userId"
)
-- Aggregate all flows per user-friend-currency-group combination
SELECT
  "groupId",
  currency,
  "userId",
  "friendId",
  SUM(amount)::bigint as amount,
  NOW() as "createdAt",
  NOW() as "updatedAt",
  false as "importedFromSplitwise"
FROM cross_user_flows
GROUP BY "groupId", currency, "userId", "friendId"
HAVING SUM(amount) != 0;  -- Only keep non-zero balances
