import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import NordigenClient from "nordigen-node"

const client = new NordigenClient({
  secretId: env.GOCARDLESS_SECRET_ID,
  secretKey: env.GOCARDLESS_SECRET_KEY
});

export interface GoCardlessTransaction {
  transactionId: string;
  entryReference: string;
  bookingDate: string;
  valueDate: string;
  transactionAmount: {
    amount: string
    currency: string
  }
  remittanceInformationUnstructured: string;
  remittanceInformationStructured: string;
  additionalInformation: string;
  internalTransactionId: string;
}

interface GoCardlessGetTransactions {
  transactions: {
    booked: GoCardlessTransaction[]
    pending: GoCardlessTransaction[]
  }
}

const SingleTransaction = z.object({
  bookingDate: z.string(),
  remittanceInformationUnstructured: z.string(),
  transactionId: z.string(),
  transactionAmount: z.object({
    amount: z.string(),
    currency: z.string()
  })
})

export type SingleTransactionType = z.infer<typeof SingleTransaction>;

export const gocardlessRouter = createTRPCRouter({
  getTransactions: protectedProcedure
    .input(z.string().optional())
    .query(async ({ input, ctx }) => {
      const requisitionId = input
      if (!requisitionId) return

      await client.generateToken();

      const requisitionData = await client.requisition.getRequisitionById(requisitionId);

      const accountId = requisitionData.accounts[0];

      const cachedData = await ctx.db.cachedBankData.findUnique({
        where: { gocardlessId: accountId, userId: ctx.session.user.id },
      });

      if (cachedData) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (cachedData.lastFetched > twentyFourHoursAgo) {
          if (!cachedData.data) {
            throw new Error('Failed to fetch cached transactions');
          }
          return JSON.parse(cachedData.data) as GoCardlessGetTransactions;
        }
      }

      const account = client.account(accountId ?? "");

      const transactions = await account.getTransactions();

      if (!transactions) {
        throw new Error('Failed to fetch transactions');
      }

      await ctx.db.cachedBankData.upsert({
        where: { gocardlessId: accountId, userId: ctx.session.user.id },
        update: { data: JSON.stringify(transactions), lastFetched: new Date(), userId: ctx.session.user.id },
        create: { gocardlessId: accountId ?? "", data: JSON.stringify(transactions), lastFetched: new Date(), userId: ctx.session.user.id },
      });
  
      return transactions;
  }),
  connectToBank: protectedProcedure
    .input(z.string().optional())
    .mutation(async ({ input, ctx }) => {
      await client.generateToken();

      const institutionId = input ?? "NORDEA_NDEASESS";
      const generateRandomId = Array.from({ length: 60 }, () => Math.random().toString(36)[2]).join('');

      const init = await client.initSession({
          redirectUrl: env.NEXTAUTH_URL,
          institutionId: institutionId,
          referenceId: generateRandomId,
          user_language: "SV",
          redirect_immediate: false,
          account_selection: false,
      })

      await ctx.db.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          gocardlessId: init.id
        },
      });

      if (!init) {
        throw new Error('Failed to link to bank');
      }

      return init;
  }),
  getInstitutions: protectedProcedure
    .input(z.string().optional())
    .query(async ({ input }) => {
      const country = input

      await client.generateToken();

      const institutionsData = await client.institution.getInstitutions(country ? {country} : undefined)

      if (!institutionsData) {
        throw new Error('Failed to fetch institutions');
      }
  
      return institutionsData;
  }),
})