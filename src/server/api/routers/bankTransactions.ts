import { createTRPCRouter, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { whichBankConnectionConfigured } from '~/server/bankTransactionHelper';
import { InstitutionsOutput, TransactionOutput } from '~/types/bank.types';
import { bankTransactionService } from '../services/bankTransactions/bankTransactionService';
import { TRPCError } from '@trpc/server';

export const bankTransactionsRouter = createTRPCRouter({
  getTransactions: protectedProcedure
    .input(z.string().optional())
    .output(TransactionOutput.optional())
    .query(
      async ({ input: token, ctx }) =>
        await bankTransactionService.getTransactions(ctx.session.user.id, token),
    ),
  connectToBank: protectedProcedure
    .input(z.string().optional())
    .output(
      z
        .object({
          institutionId: z.string(),
          authLink: z.string(),
        })
        .optional(),
    )
    .mutation(async ({ input: institutionId, ctx }) => {
      const provider = whichBankConnectionConfigured();
      if (provider === 'GOCARDLESS') {
        // Deprecated
        const res = await bankTransactionService
          ?.getProvider()
          ?.connectToBank(institutionId, ctx.session.user.preferredLanguage);

        if (!res) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to link to bank' });
        }

        await ctx.db.user.update({
          where: {
            id: ctx.session.user.id,
          },
          data: {
            obapiProviderId: res.institutionId,
          },
        });

        return res;
      }
      const res = await bankTransactionService.connectToBank(
        ctx.session.user.id.toString(),
        ctx.session.user.preferredLanguage,
      );
      return res;
    }),
  getInstitutions: protectedProcedure
    .output(InstitutionsOutput)
    .query(async () => await bankTransactionService.getInstitutions()),
  // Explicit for PLAID
  exchangePublicToken: protectedProcedure
    .input(z.string())
    .output(
      z
        .object({
          accessToken: z.string(),
          itemId: z.string(),
        })
        .optional(),
    )
    .mutation(async ({ input: publicToken, ctx }) => {
      if (whichBankConnectionConfigured() === 'PLAID') {
        const res = await bankTransactionService?.getProvider()?.exchangePublicToken?.(publicToken);

        if (!res) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to exchange public token',
          });
        }

        await ctx.db.user.update({
          where: {
            id: ctx.session.user.id,
          },
          data: {
            obapiProviderId: res.accessToken,
          },
        });

        return res;
      }
    }),
});
