import React, { useCallback, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { api } from '~/utils/api';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';

interface PlaidLinkProps {
  linkToken: string;
  onSuccess?: () => void;
  onExit?: () => void;
}

export const PlaidLink: React.FC<PlaidLinkProps> = ({ linkToken, onSuccess, onExit }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const exchangePublicToken = api.bankTransactions.exchangePublicToken.useMutation();
  const utils = api.useUtils();

  const onPlaidSuccess = useCallback(
    async (publicToken: string, _metadata: any) => {
      setIsLoading(true);
      try {
        await exchangePublicToken.mutateAsync(publicToken);
        toast.success(t('account.plaid.bank_connected_successfully'));
        await utils.user.me.refetch();
        onSuccess?.();
      } catch (error) {
        console.error('Error exchanging public token:', error);
        toast.error(t('account.plaid.bank_connection_failed'));
      } finally {
        setIsLoading(false);
      }
    },
    [exchangePublicToken, utils.user.me, onSuccess, t],
  );

  const onPlaidExit = useCallback(
    (err: any, _metadata: any) => {
      if (err) {
        console.error('Plaid Link error:', err);
        toast.error(t('account.plaid.bank_connection_cancelled'));
      }
      onExit?.();
    },
    [onExit, t],
  );

  const config = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  };

  const { open, ready } = usePlaidLink(config);

  const handleClick = useCallback(() => {
    if (ready && !isLoading) {
      open();
    }
  }, [open, ready, isLoading]);

  return (
    <button
      onClick={handleClick}
      disabled={!ready || isLoading}
      className="text-md hover:text-foreground/80 flex w-full items-center justify-between gap-4 px-0"
    >
      <div className="flex items-center gap-4">
        <div className="h-5 w-5 text-teal-500">
          <div className="h-5 w-5 rounded bg-teal-500" />
        </div>
        <p>
          {isLoading ? t('account.plaid.connecting_to_bank') : t('account.plaid.connect_to_bank')}
        </p>
      </div>
    </button>
  );
};
