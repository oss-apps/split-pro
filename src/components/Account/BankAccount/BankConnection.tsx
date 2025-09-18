import React, { useCallback, useState } from 'react';
import { ChevronRight, CreditCard } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { Button } from '~/components/ui/button';
import { BankAccountSelect } from './BankAccountSelect';
import { PlaidLink } from './PlaidLink';
import { api } from '~/utils/api';

interface BankConnectionProps {
  bankConnectionEnabled: boolean;
  bankConnection: string | null;
}

export const BankConnection: React.FC<BankConnectionProps> = ({
  bankConnectionEnabled,
  bankConnection,
}) => {
  const { t } = useTranslation();
  const userQuery = api.user.me.useQuery();
  const connectToBank = api.bankTransactions.connectToBank.useMutation();
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);

  const onConnectToBank = useCallback(async () => {
    const res = await connectToBank.mutateAsync(userQuery.data?.bankingId);
    if (res?.authLink) {
      if (bankConnection === 'GOCARDLESS') {
        window.location.href = res.authLink;
      } else if (bankConnection === 'PLAID') {
        setPlaidLinkToken(res.authLink);
      }
    }
  }, [connectToBank, userQuery.data?.bankingId, bankConnection]);

  const onPlaidSuccess = useCallback(() => {
    setPlaidLinkToken(null);
    userQuery.refetch().catch(console.error);
  }, [userQuery]);

  const onPlaidExit = useCallback(() => {
    setPlaidLinkToken(null);
  }, []);

  if (!bankConnectionEnabled) {
    return null;
  }

  return (
    <>
      <BankAccountSelect bankConnectionEnabled={bankConnectionEnabled} />
      {userQuery.data?.bankingId && (
        <>
          {plaidLinkToken ? (
            <PlaidLink linkToken={plaidLinkToken} onSuccess={onPlaidSuccess} onExit={onPlaidExit} />
          ) : (
            <Button
              onClick={onConnectToBank}
              variant="ghost"
              className="text-md hover:text-foreground/80 w-full justify-between px-0"
            >
              <div className="flex items-center gap-4">
                <CreditCard className="h-5 w-5 text-teal-500" />
                <p>
                  {userQuery.data?.obapiProviderId ? t('account.reconnect') : t('account.connect')}{' '}
                  {t('account.to_bank')}
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-gray-500" />
            </Button>
          )}
        </>
      )}
    </>
  );
};
