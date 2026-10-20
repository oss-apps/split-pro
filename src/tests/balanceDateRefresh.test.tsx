/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { useBalanceDateRefresh } from '~/hooks/useBalanceDateRefresh';

const invalidate = jest.fn().mockResolvedValue(undefined);
const utils = {
  expense: { getBalances: { invalidate }, getCumulatedBalances: { invalidate } },
  user: { getBalancesWithFriend: { invalidate } },
  group: { getAllGroupsWithBalances: { invalidate }, getGroupDetails: { invalidate } },
};
jest.mock('~/utils/api', () => ({ api: { useUtils: () => utils } }));

const Refresh = () => {
  useBalanceDateRefresh();
  return null;
};

const mockTimeZone = (getZone: () => string) => {
  const DateTimeFormat = Intl.DateTimeFormat;
  jest
    .spyOn(Intl, 'DateTimeFormat')
    .mockImplementation(
      (locales, options) =>
        new DateTimeFormat(locales, { ...options, timeZone: options?.timeZone ?? getZone() }),
    );
};

describe('balance date cache refresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T23:59:59Z'));
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('refreshes balances at local midnight and cleans up timers on unmount', async () => {
    mockTimeZone(() => 'UTC');
    const root = createRoot(document.createElement('div'));
    await act(async () => root.render(<Refresh />));
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    expect(invalidate).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(1000));
    expect(invalidate).toHaveBeenCalledTimes(5);
    await act(async () => root.unmount());
    jest.runOnlyPendingTimers();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('refreshes a suspended tab after a timezone change', async () => {
    let timeZone = 'UTC';
    mockTimeZone(() => timeZone);
    const root = createRoot(document.createElement('div'));
    await act(async () => root.render(<Refresh />));
    timeZone = 'Asia/Tokyo';
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(invalidate).toHaveBeenCalledTimes(5);
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(invalidate).toHaveBeenCalledTimes(5);
    await act(async () => root.unmount());
  });
});
