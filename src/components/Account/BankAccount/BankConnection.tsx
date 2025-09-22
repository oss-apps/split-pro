import React, { useCallback } from 'react';
import { BankAccountSelect } from './BankAccountSelect';
import { PlaidLink } from './PlaidLink';
import { api } from '~/utils/api';
import type { ButtonProps } from '~/components/ui/button';

interface BankConnectionProps {
  bankConnectionEnabled: boolean;
  bankConnection: string | null;
  children: React.ReactElement<ButtonProps>;
}

export const BankConnection: React.FC<BankConnectionProps> = ({
  bankConnectionEnabled,
  bankConnection,
  children,
}) => {
  const userQuery = api.user.me.useQuery();
  const connectToBank = api.bankTransactions.connectToBank.useMutation();

  const onConnectToBank = useCallback(async () => {
    if (bankConnection === 'GOCARDLESS') {
      if (!userQuery.data?.bankingId) {
        return;
      }
      const res = await connectToBank.mutateAsync(userQuery.data.bankingId);
      if (res?.authLink) {
        window.location.href = res.authLink;
      }
    } else if (bankConnection === 'PLAID') {
      const res = await connectToBank.mutateAsync();
      if (res?.authLink) {
        return res.authLink;
      }
    }
  }, [connectToBank, userQuery.data?.bankingId, bankConnection]);

  const fetchUser = useCallback(() => {
    userQuery.refetch().catch(console.error);
  }, [userQuery]);

  if (!bankConnectionEnabled) {
    return null;
  }

  return (
    <>
      {bankConnection === 'GOCARDLESS' && (
        <BankAccountSelect bankConnectionEnabled={bankConnectionEnabled} />
      )}

      {bankConnection === 'PLAID' ? (
        <PlaidLink onConnect={onConnectToBank} onSuccess={fetchUser}>
          {children}
        </PlaidLink>
      ) : (
        bankConnection === 'GOCARDLESS' &&
        userQuery.data?.bankingId &&
        React.cloneElement(children, { onClick: onConnectToBank } as Partial<ButtonProps>)
      )}
    </>
  );
};
