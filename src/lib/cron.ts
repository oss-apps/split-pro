import cronParser from 'cron-parser';

/** Calendar fields belong to the instance calendar, never to the browser offset. */
export const normalizeRecurrence = (expression: string): string => {
  const fields = expression.trim().replaceAll('$', 'L').split(/\s+/);
  if (5 !== fields.length) {
    throw new Error('Expected a five-field recurrence');
  }
  const normalized = `0 0 ${fields.slice(2).join(' ')}`;
  cronParser.parseExpression(normalized, { tz: 'UTC' });
  return normalized;
};

export const cronToBackend = (expression: string) =>
  normalizeRecurrence(expression).replaceAll('L', '$');

export const cronFromBackend = (expression: string) => normalizeRecurrence(expression);

/**
 * Extracts the template expense ID from a pg_cron job command.
 * The command format is: SELECT duplicate_expense_with_participants('UUID'::UUID);
 */
export const extractTemplateExpenseId = (command: string): string | null => {
  const match = /duplicate_expense_with_participants\('([0-9a-f-]{36})'::UUID\)/i.exec(command);
  return match?.[1] ?? null;
};
