-- Add settledAt to ExpenseParticipant for per-expense settlement tracking.
-- NULL = unsettled (default). All existing rows remain NULL, preserving
-- accumulated-mode behaviour unchanged. The BalanceView does not reference
-- this column, so accumulated mode is completely unaffected.
ALTER TABLE "ExpenseParticipant" ADD COLUMN "settledAt" TIMESTAMP(3);
