import { cronFromBackend, cronToBackend } from '~/lib/cron';

describe('date-only recurrence', () => {
  it.each([-840, -120, 0, 90, 720])('preserves dates at offset %s', (offset) => {
    jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(offset);
    expect(cronToBackend('0 0 L * *')).toBe('0 0 $ * *');
    expect(cronToBackend('0 0 1 3 *')).toBe('0 0 1 3 *');
    expect(cronToBackend('0 0 * * 0')).toBe('0 0 * * 0');
    jest.restoreAllMocks();
  });
  it('drops time without shifting dates', () => {
    expect(cronToBackend('15 23 31 12 *')).toBe('0 0 31 12 *');
    expect(cronFromBackend('30 22 $ * *')).toBe('0 0 L * *');
  });
  it('rejects malformed schedules', () => {
    expect(() => cronToBackend('10 seconds')).toThrow();
    expect(() => cronToBackend('0 0 32 * *')).toThrow();
  });
});
