import { env } from '~/env';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc';
import { z } from 'zod';
import NordigenClient, { type GetTransactions } from 'nordigen-node';
import { format, subDays } from 'date-fns';
import { getDbCachedData, setDbCachedData } from '../services/dbCache';
import type { CachedBankData } from '@prisma/client';
import { whichBankConnectionConfigured } from '~/server/bankTransactions';

const goCardlessClient = new NordigenClient({
  secretId: env.GOCARDLESS_SECRET_ID,
  secretKey: env.GOCARDLESS_SECRET_KEY,
});

// When adding more, please model the output so the components are reusable.
export const bankTransactionsRouter = createTRPCRouter({
  getTransactions: protectedProcedure
    .input(z.string().optional())
    .query(async ({ input: requisitionId, ctx }) => {
      if (whichBankConnectionConfigured() === 'GOCARDLESS') {
        if (!requisitionId) {
          return;
        }

        await goCardlessClient.generateToken();

        const requisitionData =
          await goCardlessClient.requisition.getRequisitionById(requisitionId);

        const accountId = requisitionData.accounts[0];

        const cachedData = await getDbCachedData<CachedBankData, 'cachedBankData'>({
          key: 'cachedBankData',
          where: { obapiProviderId: accountId, userId: ctx.session.user.id },
        });

        if (cachedData) {
          if (!cachedData.data) {
            throw new Error('Failed to fetch cached transactions');
          }
          return JSON.parse(cachedData.data) as GetTransactions;
        }

        const account = goCardlessClient.account(accountId ?? '');

        const intervalInDays = env.GOCARDLESS_INTERVAL_IN_DAYS ?? 30;
        // Date needs to be in YYYY-MM-DD format according to Nordigen.
        // TODO: In future make it possible to filter on datefrom.
        const transactions = await account.getTransactions({
          dateTo: format(new Date(), 'yyyy-MM-dd'),
          dateFrom: format(subDays(new Date(), intervalInDays), 'yyyy-MM-dd'),
        });

        if (!transactions) {
          throw new Error('Failed to fetch transactions');
        }

        await setDbCachedData({
          key: 'cachedBankData',
          where: { obapiProviderId: accountId ?? '', userId: ctx.session.user.id },
          data: {
            obapiProviderId: accountId ?? '',
            data: JSON.stringify(transactions),
            lastFetched: new Date(),
            userId: ctx.session.user.id,
          },
        });

        return transactions;
      } else {
        return [];
      }
    }),
  connectToBank: protectedProcedure
    .input(z.string().optional())
    .mutation(async ({ input: institutionId, ctx }) => {
      if (whichBankConnectionConfigured() === 'GOCARDLESS') {
        if (!institutionId) {
          return;
        }

        await goCardlessClient.generateToken();

        const generateRandomId = Array.from(
          { length: 60 },
          () => Math.random().toString(36)[2],
        ).join('');

        const init = await goCardlessClient.initSession({
          redirectUrl: env.NEXTAUTH_URL,
          institutionId: institutionId,
          referenceId: generateRandomId,
          user_language: 'SV',
          redirect_immediate: false,
          account_selection: false,
        });

        await ctx.db.user.update({
          where: {
            id: ctx.session.user.id,
          },
          data: {
            obapiProviderId: init.id,
          },
        });

        if (!init) {
          throw new Error('Failed to link to bank');
        }

        return init;
      }
    }),
  getInstitutions: protectedProcedure.query(async () => {
    if (whichBankConnectionConfigured() === 'GOCARDLESS') {
      await goCardlessClient.generateToken();

      const institutionsData = await goCardlessClient.institution.getInstitutions(
        env.GOCARDLESS_COUNTRY ? { country: env.GOCARDLESS_COUNTRY } : undefined,
      );

      if (!institutionsData) {
        throw new Error('Failed to fetch institutions');
      }

      return institutionsData;
    } else {
      return [];
    }
  }),
});
