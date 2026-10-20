export const BALANCE_TIME_ZONE_HEADER = 'x-splitpro-time-zone';

export const getBalanceDay = (
  timeZone = 'UTC',
  now = new Date(),
): {
  timeZone: string;
  day: string;
  toDateExclusive: Date;
} => {
  const formatter = (() => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    }
  })();
  const day = formatter.format(now);
  // Search for the next calendar-day boundary rather than adding 24 hours.
  // This also handles offset changes at midnight and skipped calendar dates.
  const [, end] = Array.from({ length: 28 }).reduce<[number, number]>(
    ([start, finish]) => {
      if (1 >= finish - start) {
        return [start, finish];
      }
      const middle = Math.floor((start + finish) / 2);
      return formatter.format(new Date(middle)) === day ? [middle, finish] : [start, middle];
    },
    [now.getTime(), now.getTime() + 48 * 60 * 60 * 1000],
  );
  return {
    timeZone: formatter.resolvedOptions().timeZone,
    day,
    toDateExclusive: new Date(end),
  };
};
