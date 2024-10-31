import { env } from "~/env";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";
import NordigenClient, { type GetTransactions } from "nordigen-node"

const client = new NordigenClient({
  secretId: env.GOCARDLESS_SECRET_ID,
  secretKey: env.GOCARDLESS_SECRET_KEY
});

export const gocardlessRouter = createTRPCRouter({
  getTransactions: protectedProcedure
    .input(z.string().optional())
    .query(async ({ input: requisitionId, ctx }) => {
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
          return JSON.parse(cachedData.data) as GetTransactions;
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
    .mutation(async ({ input: institutionId, ctx }) => {
      if (!institutionId) return

      await client.generateToken();

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
    .query(async () => {
      await client.generateToken();

      const institutionsData = await client.institution.getInstitutions(env.GOCARDLESS_COUNTRY ? {country: env.GOCARDLESS_COUNTRY} : undefined)

      if (!institutionsData) {
        throw new Error('Failed to fetch institutions');
      }
  
      return institutionsData;
  }),
  gocardlessEnabled: publicProcedure
    .query(async () => {
      return env.GOCARDLESS_ENABLED ?? false
  }),
})
