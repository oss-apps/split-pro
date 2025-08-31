import { createTRPCRouter, protectedProcedure } from '../trpc';
import { z } from 'zod';
import {
  InstitutionsOutput,
  TransactionOutput,
  whichBankConnectionConfigured,
} from '~/server/bankTransactionHelper';
import { gocardless } from '~/server/bankTransactionsController/goCardless/gocardless';

// When adding more, please model the output so the components are reusable.
export const bankTransactionsRouter = createTRPCRouter({
  getTransactions: protectedProcedure
    .input(z.string().optional())
    .output(TransactionOutput.optional())
    .query(async ({ input: requisitionId, ctx }) => {
      if (whichBankConnectionConfigured() === 'GOCARDLESS') {
        return await gocardless.getTransactions(ctx.session.user.id, requisitionId);
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
      if (whichBankConnectionConfigured() === 'GOCARDLESS') {
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
    }),
  getInstitutions: protectedProcedure.output(InstitutionsOutput).query(async () => {
    if (whichBankConnectionConfigured() === 'GOCARDLESS') {
      return await gocardless.getInstitutions();
    } else {
      return [];
    }
  }),
});
