import { parseTimeZone } from './timeZone';

describe('parseTimeZone', () => {
  it.each(['Europe/Warsaw', 'America/New_York', 'Asia/Kathmandu', 'UTC'])(
    'accepts the browser time zone %s',
    (timeZone) => {
      expect(parseTimeZone(timeZone)).toBe(
        new Intl.DateTimeFormat(undefined, { timeZone }).resolvedOptions().timeZone,
      );
    },
  );

  it.each([undefined, null, '', ' ', 'invalid/time-zone', ['Europe/Warsaw'], 120])(
    'uses UTC for missing or invalid input %p',
    (value) => {
      expect(parseTimeZone(value)).toBe('UTC');
    },
  );
});
