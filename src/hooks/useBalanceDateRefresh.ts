import { useEffect } from 'react';

import { getBalanceDay } from '~/lib/balanceDate';
import { api } from '~/utils/api';

/** Header-derived dates do not change query keys, so invalidate on scope changes. */
export const useBalanceDateRefresh = () => {
  const utils = api.useUtils();
  useEffect(() => {
    const current = () => getBalanceDay(Intl.DateTimeFormat().resolvedOptions().timeZone);
    let scope = current();
    let timer: ReturnType<typeof setTimeout> | undefined = undefined;
    const refresh = () => {
      const next = current();
      if (scope.day !== next.day || scope.timeZone !== next.timeZone) {
        Promise.all([
          utils.expense.getBalances.invalidate(),
          utils.expense.getCumulatedBalances.invalidate(),
          utils.user.getBalancesWithFriend.invalidate(),
          utils.group.getAllGroupsWithBalances.invalidate(),
          utils.group.getGroupDetails.invalidate(),
        ]).catch(console.error);
      }
      scope = next;
      clearTimeout(timer);
      timer = setTimeout(refresh, Math.max(1, scope.toDateExclusive.getTime() - Date.now()));
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [utils]);
};
