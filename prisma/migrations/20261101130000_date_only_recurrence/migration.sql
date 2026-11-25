-- Preserve saved calendar fields; original browser time zones cannot be recovered.
ALTER TABLE "ExpenseRecurrence" ADD COLUMN "lastOccurrenceDate" DATE;
UPDATE cron.job j
SET schedule = '0 0 ' || array_to_string((regexp_split_to_array(trim(j.schedule), '\s+'))[3:5], ' ')
FROM "ExpenseRecurrence" r WHERE r."jobId" = j.jobid;

-- Existing generated expenses count as consumed occurrences, including soft-deleted ones.
UPDATE "ExpenseRecurrence" r
SET "lastOccurrenceDate" = dates.last_day
FROM (
  SELECT "recurrenceId", max((("expenseDate" AT TIME ZONE 'UTC') AT TIME ZONE
    coalesce(current_setting('cron.timezone', true), 'UTC'))::date) AS last_day
  FROM "Expense"
  GROUP BY "recurrenceId"
) dates
WHERE dates."recurrenceId" = r.id;

CREATE OR REPLACE FUNCTION duplicate_expense_with_participants(original_expense_id UUID)
RETURNS UUID AS $$
DECLARE
    new_expense_id UUID;
    recurrence_id INTEGER;
    calendar_zone TEXT := coalesce(current_setting('cron.timezone', true), 'UTC');
    occurrence_day DATE := (CURRENT_TIMESTAMP AT TIME ZONE calendar_zone)::date;
    initial_day DATE;
    last_day DATE;
BEGIN
    SELECT "recurrenceId" INTO recurrence_id FROM "Expense" WHERE id = original_expense_id;
    IF recurrence_id IS NULL THEN RETURN NULL; END IF;
    SELECT "lastOccurrenceDate" INTO last_day FROM "ExpenseRecurrence"
    WHERE id = recurrence_id FOR UPDATE;
    SELECT (("expenseDate" AT TIME ZONE 'UTC') AT TIME ZONE calendar_zone)::date
    INTO initial_day FROM "Expense" WHERE id = original_expense_id;
    IF occurrence_day <= initial_day OR occurrence_day <= last_day THEN
        RETURN NULL;
    END IF;
    UPDATE "ExpenseRecurrence" SET "lastOccurrenceDate" = occurrence_day WHERE id = recurrence_id;
    -- STEP 1: Insert the new expense and get its new ID
    INSERT INTO "Expense" (
        "paidBy", "addedBy", name, category, amount, "splitType", "expenseDate", "updatedAt",
        currency, "groupId", "updatedBy", "recurrenceId"
    )
    SELECT
        "paidBy", "addedBy", name, category, amount, "splitType", CURRENT_TIMESTAMP AT TIME ZONE 'UTC', CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
        currency, "groupId", "updatedBy", "recurrenceId"
    FROM "Expense"
    WHERE id = original_expense_id
    RETURNING id INTO new_expense_id;
    -- STEP 2: Insert the new expense participants
    INSERT INTO "ExpenseParticipant" (
        "expenseId", "userId", amount
    )
    SELECT
        new_expense_id, "userId", amount
    FROM "ExpenseParticipant"
    WHERE "expenseId" = original_expense_id;
    -- STEP 3: Set notified to false in the ExpenseRecurrence table
    UPDATE "ExpenseRecurrence"
    SET notified = false
    WHERE id = (SELECT "recurrenceId" FROM "Expense" WHERE id = original_expense_id);
    -- STEP 4: Return the new expense ID
    RETURN new_expense_id;
END;
$$ LANGUAGE plpgsql;
