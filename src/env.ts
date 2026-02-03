import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (str) => !str.includes('YOUR_MYSQL_URL_HERE'),
        'You forgot to change the default URL',
      ),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DOCKER_OUTPUT: z.boolean().default(false),
    NEXTAUTH_SECRET: 'production' === process.env.NODE_ENV ? z.string() : z.string().optional(),
    NEXTAUTH_URL: z.preprocess(
      // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
      // Since NextAuth.js automatically uses the VERCEL_URL if present.
      (str) => process.env.VERCEL_URL ?? str,
      // VERCEL_URL doesn't include `https` so it cant be validated as a URL
      process.env.VERCEL ? z.string() : z.string().url(),
    ),
    NEXTAUTH_URL_INTERNAL: z.preprocess(
      (str) => process.env.VERCEL_URL ?? str,
      process.env.VERCEL ? z.string() : z.string().url(),
    ),
    CLEAR_CACHE_CRON_RULE: z.string().optional(),
    CACHE_RETENTION_INTERVAL: z.string().optional(),
    ENABLE_SENDING_INVITES: z.boolean(),
    DISABLE_EMAIL_SIGNUP: z.boolean(),
    INVITE_ONLY: z.boolean(),
    FROM_EMAIL: z.string().optional(),
    EMAIL_SERVER_HOST: z.string().optional(),
    EMAIL_SERVER_PORT: z.string().optional(),
    EMAIL_SERVER_USER: z.string().optional(),
    EMAIL_SERVER_PASSWORD: z.string().optional(),
    GOCARDLESS_COUNTRY: z.string().optional(),
    GOCARDLESS_SECRET_ID: z.string().optional(),
    GOCARDLESS_SECRET_KEY: z.string().optional(),
    GOCARDLESS_INTERVAL_IN_DAYS: z.number().optional(),
    PLAID_CLIENT_ID: z.string().optional(),
    PLAID_SECRET: z.string().optional(),
    PLAID_ENVIRONMENT: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
    PLAID_COUNTRY_CODES: z.string().optional(),
    PLAID_INTERVAL_IN_DAYS: z.number().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    AUTHENTIK_ID: z.string().optional(),
    AUTHENTIK_SECRET: z.string().optional(),
    AUTHENTIK_ISSUER: z.string().optional(),
    KEYCLOAK_ID: z.string().optional(),
    KEYCLOAK_SECRET: z.string().optional(),
    KEYCLOAK_ISSUER: z.string().optional(),
    WEB_PUSH_EMAIL: z.string().optional(),
    WEB_PUSH_PRIVATE_KEY: z.string().optional(),
    WEB_PUSH_PUBLIC_KEY: z.string().optional(),
    FEEDBACK_EMAIL: z.string().optional(),
    DISCORD_WEBHOOK_URL: z.string().optional(),
    DEFAULT_HOMEPAGE: z.string().default('/home'),
    CURRENCY_RATE_PROVIDER: z
      .enum(['frankfurter', 'openexchangerates', 'nbp'])
      .default('frankfurter'),
    OPEN_EXCHANGE_RATES_APP_ID: z.string().optional(),
    OIDC_NAME: z.string().optional(),
    OIDC_CLIENT_ID: z.string().optional(),
    OIDC_CLIENT_SECRET: z.string().optional(),
    OIDC_WELL_KNOWN_URL: z.string().optional(),
    OIDC_ALLOW_DANGEROUS_EMAIL_LINKING: z.boolean().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_FRANKFURTER_USED: z.boolean().default(false),
    NEXT_PUBLIC_IS_CLOUD_DEPLOYMENT: z.boolean().default(false),
    NEXT_PUBLIC_VERSION: z.string().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL:
      process.env.DATABASE_URL ??
      `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}`,
    NODE_ENV: process.env.NODE_ENV,
    DOCKER_OUTPUT: !!process.env.DOCKER_OUTPUT,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_URL_INTERNAL: process.env.NEXTAUTH_URL_INTERNAL ?? process.env.NEXTAUTH_URL,
    CLEAR_CACHE_CRON_RULE: process.env.CLEAR_CACHE_CRON_RULE ?? '0 2 * * 0',
    CACHE_RETENTION_INTERVAL: process.env.CACHE_RETENTION_INTERVAL ?? '2 days',
    ENABLE_SENDING_INVITES: 'true' === process.env.ENABLE_SENDING_INVITES,
    DISABLE_EMAIL_SIGNUP: 'true' === process.env.DISABLE_EMAIL_SIGNUP,
    INVITE_ONLY: 'true' === process.env.INVITE_ONLY,
    FROM_EMAIL: process.env.FROM_EMAIL,
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
    GOCARDLESS_COUNTRY: process.env.GOCARDLESS_COUNTRY,
    GOCARDLESS_SECRET_ID: process.env.GOCARDLESS_SECRET_ID,
    GOCARDLESS_SECRET_KEY: process.env.GOCARDLESS_SECRET_KEY,
    GOCARDLESS_INTERVAL_IN_DAYS: process.env.GOCARDLESS_INTERVAL_IN_DAYS,
    PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID,
    PLAID_SECRET: process.env.PLAID_SECRET,
    PLAID_ENVIRONMENT: process.env.PLAID_ENVIRONMENT,
    PLAID_COUNTRY_CODES: process.env.PLAID_COUNTRY_CODES,
    PLAID_INTERVAL_IN_DAYS: process.env.PLAID_INTERVAL_IN_DAYS,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    AUTHENTIK_ID: process.env.AUTHENTIK_ID,
    AUTHENTIK_SECRET: process.env.AUTHENTIK_SECRET,
    AUTHENTIK_ISSUER: process.env.AUTHENTIK_ISSUER,
    KEYCLOAK_ID: process.env.KEYCLOAK_ID,
    KEYCLOAK_SECRET: process.env.KEYCLOAK_SECRET,
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
    WEB_PUSH_EMAIL: process.env.WEB_PUSH_EMAIL,
    WEB_PUSH_PRIVATE_KEY: process.env.WEB_PUSH_PRIVATE_KEY,
    WEB_PUSH_PUBLIC_KEY: process.env.WEB_PUSH_PUBLIC_KEY,
    FEEDBACK_EMAIL: process.env.FEEDBACK_EMAIL,
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
    DEFAULT_HOMEPAGE: process.env.DEFAULT_HOMEPAGE,
    CURRENCY_RATE_PROVIDER: process.env.CURRENCY_RATE_PROVIDER,
    OPEN_EXCHANGE_RATES_APP_ID: process.env.OPEN_EXCHANGE_RATES_APP_ID,
    OIDC_NAME: process.env.OIDC_NAME,
    OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
    OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
    OIDC_WELL_KNOWN_URL: process.env.OIDC_WELL_KNOWN_URL,
    OIDC_ALLOW_DANGEROUS_EMAIL_LINKING: !!process.env.OIDC_ALLOW_DANGEROUS_EMAIL_LINKING,
    NEXT_PUBLIC_FRANKFURTER_USED: process.env.CURRENCY_RATE_PROVIDER === 'frankfurter',
    NEXT_PUBLIC_IS_CLOUD_DEPLOYMENT: process.env.NEXTAUTH_URL?.includes('splitpro.app') ?? false,
    NEXT_PUBLIC_VERSION: process.env.APP_VERSION,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
