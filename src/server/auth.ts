import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { type GetServerSidePropsContext } from 'next';
import { getServerSession, type DefaultSession, type NextAuthOptions } from 'next-auth';
import { Adapter, AdapterUser } from 'next-auth/adapters';
import DiscordProvider from 'next-auth/providers/discord';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import AuthentikProvider from 'next-auth/providers/authentik';

import { env } from '~/env';
import { db } from '~/server/db';
import { sendSignUpEmail } from './mailer';

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: DefaultSession['user'] & {
      id: number;
      currency: string;
      // ...other properties
      // role: UserRole;
    };
  }

  interface User {
    id: number;
    currency: string;
  }
}

const SplitProPrismaAdapter = (...args: Parameters<typeof PrismaAdapter>): Adapter => {
  const prismaAdapter = PrismaAdapter(...args)

  return {
    ...prismaAdapter,
    createUser: async (user: Omit<AdapterUser, 'id'>): Promise<AdapterUser> => {
      const prismaCreateUser = prismaAdapter.createUser

      if (env.INVITE_ONLY) {
        throw new Error("This instance is Invite Only")
      }

      if (!prismaCreateUser) {
        // This should never happen but typing says it's possible.
        throw new Error("Prisma Adapter lacks User Creation")
      }

      return prismaCreateUser(user)
    },
  }
}


/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
        currency: user.currency,
      },
    }),
  },
  adapter: SplitProPrismaAdapter(db),
  providers: getProviders(),
  events: {
    createUser: async ({ user }) => {
      // Check if the user's name is empty
      if ((!user.name || user.name.trim() === '') && user.email) {
        // Define the logic to update the user's name here
        const updatedName = user.email.split('@')[0];

        // Use your database client to update the user's name
        await db.user.update({
          where: { id: user.id },
          data: { name: updatedName },
        });
      }
    },
  },
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext['req'];
  res: GetServerSidePropsContext['res'];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};

export const getServerAuthSessionForSSG = async (context: GetServerSidePropsContext) => {
  console.log('Before getting session');
  const session = await getServerAuthSession(context);
  console.log('After getting session');

  if (!session?.user?.email) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {
      user: session.user,
    },
  };
};

/**
 * Get providers to enable
 */
function getProviders() {
  const providersList = [];

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providersList.push(
      GoogleProvider({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (env.EMAIL_SERVER_HOST) {
    providersList.push(
      EmailProvider({
        from: env.FROM_EMAIL,
        server: {
          host: env.EMAIL_SERVER_HOST,
          port: parseInt(env.EMAIL_SERVER_PORT ?? ''),
          auth: {
            user: env.EMAIL_SERVER_USER,
            pass: env.EMAIL_SERVER_PASSWORD,
          },
        },
        async sendVerificationRequest({ identifier: email, url, token }) {
          const result = await sendSignUpEmail(email, token, url);
          if (!result) {
            throw new Error('Failed to send email');
          }
        },
        async generateVerificationToken() {
          return Math.random().toString(36).substring(2, 7).toLowerCase();
        },
      }),
    );
  }

  if (env.AUTHENTIK_ID && env.AUTHENTIK_SECRET && env.AUTHENTIK_ISSUER) {
    providersList.push(
      AuthentikProvider({
        clientId: env.AUTHENTIK_ID,
        clientSecret: env.AUTHENTIK_SECRET,
        issuer: env.AUTHENTIK_ISSUER,
		allowDangerousEmailAccountLinking: true,
      })
    );
  }
  
  return providersList;
}

/**
 * Validates the environment variables that are related to authentication.
 * this will check if atleat one provider is set properly.
 *
 * this function should be updated if new providers are added.
 */
export function validateAuthEnv() {
  console.log('Validating auth env');
  if (!process.env.SKIP_ENV_VALIDATION) {
    const providers = getProviders();
    if (providers.length === 0) {
      throw new Error(
        'No authentication providers are configured, at least one is required. Learn more here: https://github.com/oss-apps/split-pro?tab=readme-ov-file#setting-up-the-environment',
      );
    }
  }
}
