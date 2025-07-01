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
    ENABLE_SENDING_INVITES: z.boolean(),
    DISABLE_EMAIL_SIGNUP: z.boolean(),
    INVITE_ONLY: z.boolean(),
    FROM_EMAIL: z.string().optional(),
    EMAIL_SERVER_HOST: z.string().optional(),
    EMAIL_SERVER_PORT: z.string().optional(),
    EMAIL_SERVER_USER: z.string().optional(),
    EMAIL_SERVER_PASSWORD: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    AUTHENTIK_ID: z.string().optional(),
    AUTHENTIK_SECRET: z.string().optional(),
    AUTHENTIK_ISSUER: z.string().optional(),
    R2_ACCESS_KEY: z.string().optional(),
    R2_SECRET_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    R2_URL: z.string().optional(),
    R2_PUBLIC_URL: z.string().optional(),
    WEB_PUSH_EMAIL: z.string().optional(),
    WEB_PUSH_PRIVATE_KEY: z.string().optional(),
    WEB_PUSH_PUBLIC_KEY: z.string().optional(),
    FEEDBACK_EMAIL: z.string().optional(),
    DISCORD_WEBHOOK_URL: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {},

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL:
      process.env.DATABASE_URL ??
      `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}`,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_URL_INTERNAL: process.env.NEXTAUTH_URL_INTERNAL ?? process.env.NEXTAUTH_URL,
    ENABLE_SENDING_INVITES: 'true' === process.env.ENABLE_SENDING_INVITES,
    DISABLE_EMAIL_SIGNUP: 'true' === process.env.DISABLE_EMAIL_SIGNUP,
    INVITE_ONLY: 'true' === process.env.INVITE_ONLY,
    FROM_EMAIL: process.env.FROM_EMAIL,
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    AUTHENTIK_ID: process.env.AUTHENTIK_ID,
    AUTHENTIK_SECRET: process.env.AUTHENTIK_SECRET,
    AUTHENTIK_ISSUER: process.env.AUTHENTIK_ISSUER,
    R2_ACCESS_KEY: process.env.R2_ACCESS_KEY,
    R2_SECRET_KEY: process.env.R2_SECRET_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
    R2_URL: process.env.R2_URL,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    WEB_PUSH_EMAIL: process.env.WEB_PUSH_EMAIL,
    WEB_PUSH_PRIVATE_KEY: process.env.WEB_PUSH_PRIVATE_KEY,
    WEB_PUSH_PUBLIC_KEY: process.env.WEB_PUSH_PUBLIC_KEY,
    FEEDBACK_EMAIL: process.env.FEEDBACK_EMAIL,
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
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
