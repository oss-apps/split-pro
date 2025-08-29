import { env } from '~/env';

export const isBankConnectionConfigured = () =>
  env.GOCARDLESS_SECRET_ID && env.GOCARDLESS_SECRET_KEY && env.GOCARDLESS_COUNTRY;
