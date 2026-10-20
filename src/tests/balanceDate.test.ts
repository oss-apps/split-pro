import { getBalanceDay } from '~/lib/balanceDate';

describe('getBalanceDay', () => {
  it.each([
    ['UTC', '2025-03-09T12:00:00Z', '2025-03-10T00:00:00.000Z'],
    ['America/New_York', '2025-03-09T05:00:00Z', '2025-03-10T04:00:00.000Z'],
    ['America/New_York', '2025-11-02T04:00:00Z', '2025-11-03T05:00:00.000Z'],
    ['Asia/Kathmandu', '2025-01-01T00:00:00Z', '2025-01-01T18:15:00.000Z'],
    ['Pacific/Apia', '2011-12-29T12:00:00Z', '2011-12-30T10:00:00.000Z'],
    ['America/Santiago', '2025-09-06T12:00:00Z', '2025-09-07T04:00:00.000Z'],
  ])('finds the next calendar day in %s at %s', (zone, now, expected) => {
    expect(getBalanceDay(zone, new Date(now)).toDateExclusive.toISOString()).toBe(expected);
  });

  it('changes scope at exactly local midnight', () => {
    const before = getBalanceDay('America/New_York', new Date('2025-03-10T03:59:59.999Z'));
    const after = getBalanceDay('America/New_York', new Date('2025-03-10T04:00:00Z'));
    expect(before.day).not.toBe(after.day);
    expect(after.toDateExclusive.toISOString()).toBe('2025-03-11T04:00:00.000Z');
  });

  it('defaults absent and invalid zones to UTC', () => {
    const now = new Date('2025-01-01T23:00:00Z');
    expect(getBalanceDay('not-a-zone', now)).toEqual(getBalanceDay(undefined, now));
    expect(getBalanceDay(undefined, now).toDateExclusive.toISOString()).toBe(
      '2025-01-02T00:00:00.000Z',
    );
  });
});
