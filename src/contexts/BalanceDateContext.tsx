import { createContext, useEffect, useMemo, useState } from 'react';

import { api } from '~/utils/api';

/** Null keeps future expenses styled like every other expense. */
export const BalanceDateContext = createContext<number | null>(null);

export const BalanceDateProvider = ({
  enabled,
  children,
}: React.PropsWithChildren<{ enabled: boolean }>) => {
  const [now, setNow] = useState(() => new Date());
  const utils = api.useUtils();
  const cutoff = useMemo(() => {
    if (!enabled) {
      return null;
    }
    const tomorrow = new Date(now);
    return tomorrow.setHours(24, 0, 0, 0);
  }, [enabled, now]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const dateKey = (date = new Date()) =>
      `${date.toDateString()}/${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
    let currentDate = dateKey(now);
    let timer: ReturnType<typeof setTimeout> | undefined = undefined;

    const refresh = () => {
      const date = new Date();
      if (currentDate !== dateKey()) {
        currentDate = dateKey();
        setNow(date);
        // These queries all change when the browser's calendar day changes.
        Promise.all([
          utils.expense.getBalances.invalidate(),
          utils.expense.getCumulatedBalances.invalidate(),
          utils.user.getBalancesWithFriend.invalidate(),
          utils.group.getAllGroupsWithBalances.invalidate(),
          utils.group.getGroupDetails.invalidate(),
        ]).catch(console.error);
      }

      const tomorrow = new Date(date);
      tomorrow.setHours(24, 0, 0, 0);
      clearTimeout(timer);
      timer = setTimeout(refresh, tomorrow.getTime() - date.getTime());
    };

    refresh();
    window.addEventListener('focus', refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [enabled, now, utils]);

  return <BalanceDateContext.Provider value={cutoff}>{children}</BalanceDateContext.Provider>;
};
