import { env } from '~/env';

type BankProviders = 'GOCARDLESS';

export const isBankConnectionConfigured = () => !!whichBankConnectionConfigured();

export const whichBankConnectionConfigured = (): BankProviders | null => {
  if (env.GOCARDLESS_SECRET_ID && env.GOCARDLESS_SECRET_KEY && env.GOCARDLESS_COUNTRY) {
    return 'GOCARDLESS';
  }
  return null;
};
