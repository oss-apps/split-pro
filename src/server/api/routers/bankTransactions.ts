import { createTRPCRouter, protectedProcedure } from '../trpc';
import { z } from 'zod';
import {
  InstitutionsOutput,
  TransactionOutput,
  whichBankConnectionConfigured,
} from '~/server/bankTransactionHelper';
import { gocardless } from '~/server/bankTransactionsController/goCardless/gocardless';
import { plaid } from '~/server/bankTransactionsController/plaid/plaid';

// When adding more, please model the output so the components are reusable.
export const bankTransactionsRouter = createTRPCRouter({
  getTransactions: protectedProcedure
    .input(z.string().optional())
    .output(TransactionOutput.optional())
    .query(async ({ input: token, ctx }) => {
      const provider = whichBankConnectionConfigured();
      if (provider === 'GOCARDLESS') {
        return await gocardless.getTransactions(ctx.session.user.id, token);
      }
      if (provider === 'PLAID') {
        return await plaid.getTransactions(ctx.session.user.id, token);
      }
    }),
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
        const res = await gocardless.connectToBank(
          institutionId,
          ctx.session.user.preferredLanguage,
        );

        if (!res) {
          throw new Error('Failed to link to bank');
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
      if (provider === 'PLAID') {
        const res = await plaid.connectToBank(
          ctx.session.user.id.toString(),
          ctx.session.user.preferredLanguage,
        );

        if (!res) {
          throw new Error('Failed to link to bank');
        }

        return { ...res, institutionId: institutionId || '' };
      }
    }),
  getInstitutions: protectedProcedure.output(InstitutionsOutput).query(async () => {
    const provider = whichBankConnectionConfigured();
    if (provider === 'GOCARDLESS') {
      return await gocardless.getInstitutions();
    }
    if (provider === 'PLAID') {
      return await plaid.getInstitutions();
    }
    return [];
  }),
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
        const res = await plaid.exchangePublicToken(publicToken);

        if (!res) {
          throw new Error('Failed to exchange public token');
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
