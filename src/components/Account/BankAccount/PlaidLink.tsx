import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { api } from '~/utils/api';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';
import type { ButtonProps } from '~/components/ui/button';

interface PlaidLinkProps {
  onConnect: () => Promise<string | undefined>;
  onSuccess?: () => void;
  children: React.ReactElement<ButtonProps>;
}

const usePlaidLinkHook = (
  onConnect: () => Promise<string | undefined>,
  onPlaidSuccess: (publicToken: string, _metadata: any) => void,
  onPlaidExit: (err: any, _metadata: any) => void,
): { open: () => void; ready: boolean } => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const requestedRef = useRef(false);
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  });

  useEffect(() => {
    const preFunction = async () => {
      const authToken = await onConnect();
      if (authToken) {
        setLinkToken(authToken);
      }
    };

    if (!linkToken && !requestedRef.current) {
      requestedRef.current = true;
      void preFunction();
    }
  }, [linkToken, onConnect]);

  return {
    open: open as () => void,
    ready,
  };
};

export const PlaidLink: React.FC<PlaidLinkProps> = ({ onConnect, onSuccess, children }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const exchangePublicToken = api.bankTransactions.exchangePublicToken.useMutation();

  const onPlaidSuccess = useCallback(
    async (publicToken: string, _metadata: any) => {
      setIsLoading(true);
      try {
        await exchangePublicToken.mutateAsync(publicToken);
        toast.success(t('account.plaid.bank_connected_successfully'));
        onSuccess?.();
      } catch (error) {
        console.error('Error exchanging public token:', error);
        toast.error(t('account.plaid.bank_connection_failed'));
      } finally {
        setIsLoading(false);
      }
    },
    [exchangePublicToken, onSuccess, t],
  );

  const onPlaidExit = useCallback(
    (err: any, _metadata: any) => {
      if (err) {
        console.error('Plaid Link error:', err);
        toast.error(t('account.plaid.bank_connection_cancelled'));
      }
    },
    [t],
  );

  const { open, ready } = usePlaidLinkHook(onConnect, onPlaidSuccess, onPlaidExit);

  return React.cloneElement(children, {
    onClick: open,
    disabled: !ready || isLoading || (children.props as ButtonProps).disabled,
  } as Partial<ButtonProps>);
};
