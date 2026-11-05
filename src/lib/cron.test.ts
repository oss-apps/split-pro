import { cronFromBackend, cronToBackend } from '~/lib/cron';

const mockTimezoneOffset = (offset: number) =>
  jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(offset);

describe('date-only recurrence regression cases', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('drops time at negative timezone offsets', () => {
    mockTimezoneOffset(-120);

    expect(cronToBackend('0 9 * * *')).toBe('0 0 * * *');
  });

  it('drops time at positive offsets', () => {
    mockTimezoneOffset(120);

    expect(cronToBackend('0 9 * * *')).toBe('0 0 * * *');
  });

  it('preserves weekday at midnight', () => {
    mockTimezoneOffset(-90);

    expect(cronToBackend('15 0 * * 0')).toBe('0 0 * * 0');
  });

  it('preserves the 31st without shifting month', () => {
    mockTimezoneOffset(120);

    expect(cronToBackend('0 23 31 1 *')).toBe('0 0 31 1 *');
  });

  it('preserves March 1 without shifting month', () => {
    mockTimezoneOffset(-60);

    expect(cronToBackend('0 0 1 3 *')).toBe('0 0 1 3 *');
  });

  it('preserves April 30 without shifting month', () => {
    mockTimezoneOffset(120);

    expect(cronToBackend('0 23 30 4 *')).toBe('0 0 30 4 *');
  });

  it('restores last-day marker from backend notation', () => {
    mockTimezoneOffset(0);

    expect(cronFromBackend('0 0 $ * *')).toBe('0 0 L * *');
  });

  it('restores last-day marker from frontend notation', () => {
    mockTimezoneOffset(0);

    expect(cronToBackend('0 0 L * *')).toBe('0 0 $ * *');
  });

  describe('last-day recurrences without a timezone-induced date change', () => {
    it.each([
      { offset: -120, backend: '0 0 $ * *' },
      { offset: 120, backend: '0 0 $ * *' },
    ])('preserves month-end when saving with offset $offset', ({ offset, backend }) => {
      mockTimezoneOffset(offset);

      expect(cronToBackend('0 12 L * *')).toBe(backend);
    });

    it.each([
      { offset: -120, backend: '0 0 $ * *' },
      { offset: 120, backend: '0 0 $ * *' },
    ])('preserves month-end when reopening with offset $offset', ({ offset, backend }) => {
      mockTimezoneOffset(offset);

      expect(cronFromBackend(backend)).toBe('0 0 L * *');
    });
  });

  it('round-trips the date while discarding time', () => {
    mockTimezoneOffset(60);
    const expression = '15 5 * * 1';

    expect(cronFromBackend(cronToBackend(expression))).toBe('0 0 * * 1');
  });
});

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
