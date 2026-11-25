import { env } from '~/env';
import { db } from '~/server/db';

import {
  getNextRecurrenceDate,
  getRecurrenceSchedule,
  reconcileRecurrenceSchedules,
} from './recurrenceScheduleService';

jest.mock('~/env', () => ({ env: { RECURRENCE_TIME: '00:00' } }));
jest.mock('~/server/db', () => ({ db: { $transaction: jest.fn() } }));

describe('recurrence execution time', () => {
  beforeEach(() => {
    jest.replaceProperty(env, 'RECURRENCE_TIME', '00:00');
  });

  it('defaults to midnight and preserves last-day rules', () => {
    expect(getRecurrenceSchedule('15 22 L * *')).toBe('0 0 $ * *');
  });

  it('applies a configured time without shifting calendar fields', () => {
    jest.replaceProperty(env, 'RECURRENCE_TIME', '06:35');
    expect(getRecurrenceSchedule('0 0 1 1 *')).toBe('35 6 1 1 *');
    expect(getRecurrenceSchedule('0 0 $ * *')).toBe('35 6 $ * *');
    expect(getRecurrenceSchedule('0 0 * * 0')).toBe('35 6 * * 0');
  });

  it('reconciles changed jobs and leaves matching schedules alone', async () => {
    jest.replaceProperty(env, 'RECURRENCE_TIME', '06:35');
    const query = jest.fn().mockResolvedValue([
      { jobid: 1n, schedule: '0 0 $ * *' },
      { jobid: 2n, schedule: '35 6 1 1 *' },
      { jobid: 3n, schedule: '0 0 * * 0' },
    ]);
    const execute = jest.fn().mockResolvedValue(1);
    jest
      .spyOn(db, '$transaction')
      .mockImplementationOnce(async (callback: any) =>
        callback({ $queryRaw: query, $executeRaw: execute }),
      );

    expect(await reconcileRecurrenceSchedules()).toBe(2);
    expect(query.mock.calls[0]![0].join('')).toContain('JOIN "ExpenseRecurrence"');
    expect(query.mock.calls[0]![0].join('')).toContain('FOR UPDATE OF j');
    expect(execute.mock.calls.map((call) => call.slice(1))).toEqual([
      [1n, '35 6 $ * *'],
      [3n, '35 6 * * 0'],
    ]);
  });

  it('does not alter jobs on a repeated startup with matching schedules', async () => {
    const execute = jest.fn();
    jest.spyOn(db, '$transaction').mockImplementationOnce(async (callback: any) =>
      callback({
        $queryRaw: jest.fn().mockResolvedValue([{ jobid: 1n, schedule: '0 0 $ * *' }]),
        $executeRaw: execute,
      }),
    );
    expect(await reconcileRecurrenceSchedules()).toBe(0);
    expect(execute).not.toHaveBeenCalled();
  });
});

describe('recurrence preview instants', () => {
  it.each([
    ['2026-01-15T00:00:00Z', '2026-01-15T05:35:00.000Z'],
    ['2026-07-15T00:00:00Z', '2026-07-15T04:35:00.000Z'],
  ])('uses the server zone at the occurrence date (%s)', (now, expected) => {
    expect(getNextRecurrenceDate('35 6 * * *', 'Europe/Warsaw', new Date(now)).toISOString()).toBe(
      expected,
    );
  });

  it('preserves last-day semantics across February in a leap year', () => {
    expect(
      getNextRecurrenceDate(
        '0 0 $ * *',
        'Asia/Tokyo',
        new Date('2028-02-01T00:00:00Z'),
      ).toISOString(),
    ).toBe('2028-02-28T15:00:00.000Z');
  });

  it('returns an instant in the previous UTC year when the server calendar is ahead', () => {
    expect(
      getNextRecurrenceDate(
        '0 0 1 1 *',
        'Asia/Tokyo',
        new Date('2026-12-01T00:00:00Z'),
      ).toISOString(),
    ).toBe('2026-12-31T15:00:00.000Z');
  });

  it('uses the next occurrence after the configured execution time has passed', () => {
    expect(
      getNextRecurrenceDate('35 6 * * *', 'UTC', new Date('2026-01-15T06:36:00Z')).toISOString(),
    ).toBe('2026-01-16T06:35:00.000Z');
  });
});
