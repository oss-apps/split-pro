export const TIME_ZONE_HEADER = 'x-time-zone';

/** Validate request input without falling back to the server's local time zone. */
export const parseTimeZone = (value: unknown): string => {
  if ('string' !== typeof value || !value.trim()) {
    return 'UTC';
  }

  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};
