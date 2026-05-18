import { cronFromBackend, cronToBackend } from '~/lib/cron';

const mockTimezoneOffset = (offset: number) =>
  jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(offset);

describe('cron timezone conversions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shifts hours and minutes for negative timezone offsets', () => {
    mockTimezoneOffset(-120);

    expect(cronToBackend('0 9 * * *')).toBe('0 7 * * *');
  });

  it('shifts hours and minutes for positive offsets', () => {
    mockTimezoneOffset(120);

    expect(cronToBackend('0 9 * * *')).toBe('0 11 * * *');
  });

  it('handles minute underflow and day-of-week shift', () => {
    mockTimezoneOffset(-90);

    expect(cronToBackend('15 0 * * 0')).toBe('45 22 * * 6');
  });

  it('rolls month forward when crossing from the 31st', () => {
    mockTimezoneOffset(120);

    expect(cronToBackend('0 23 31 1 *')).toBe('0 1 1 2 *');
  });

  it('rolls month backward and converts to last-day marker', () => {
    mockTimezoneOffset(-60);

    expect(cronToBackend('0 0 1 3 *')).toBe('0 23 $ 2 *');
  });

  it('recovers from invalid day-of-month after timezone shift', () => {
    mockTimezoneOffset(120);

    expect(cronToBackend('0 23 30 4 *')).toBe('0 1 1 5 *');
  });

  it('restores last-day marker from backend notation', () => {
    mockTimezoneOffset(0);

    expect(cronFromBackend('0 0 $ * *')).toBe('0 0 L * *');
  });

  it('restores last-day marker from frontend notation', () => {
    mockTimezoneOffset(0);

    expect(cronToBackend('0 0 L * *')).toBe('0 0 $ * *');
  });

  it('round-trips frontend to backend and back', () => {
    mockTimezoneOffset(60);
    const expression = '15 5 * * 1';

    expect(cronFromBackend(cronToBackend(expression))).toBe(expression);
  });
});
