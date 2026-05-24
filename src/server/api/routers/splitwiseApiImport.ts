/**
 * Splitwise API Import Router
 *
 * Handles importing expenses from Splitwise using their API.
 * This provides 100% accurate import with complete expense data.
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { getAllGroupExpenses, getGroups, validateApiKey } from '~/lib/splitwise-api';
import { nanoid } from 'nanoid';
import { convertExpenseToSplitPro, mapCategory } from '~/lib/splitwise-converter';

// ============= ROUTER =============

export const splitwiseApiImportRouter = createTRPCRouter({
  /**
   * Validate Splitwise API key
   */
  validateKey: protectedProcedure
    .input(z.object({ apiKey: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const result = await validateApiKey(input.apiKey);
      return result;
    }),

  /**
   * Get groups from Splitwise
   */
  getGroups: protectedProcedure
    .input(z.object({ apiKey: z.string().min(1) }))
    .query(async ({ input }) => {
      const groups = await getGroups(input.apiKey);

      // Return groups with summary info
      return groups.map((group) => ({
        id: group.id,
        name: group.name,
        memberCount: group.members.length,
        members: group.members.map((m) => ({
          id: m.id,
          name: `${m.first_name}${m.last_name ? ` ${m.last_name}` : ''}`,
          email: m.email,
          balance: m.balance,
        })),
        simplifyByDefault: group.simplify_by_default,
        createdAt: group.created_at,
      }));
    }),

  /**
   * Import a single group from Splitwise
   */
  importGroup: protectedProcedure
    .input(
      z.object({
        apiKey: z.string().min(1),
        groupId: z.number(),
        groupName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;

      console.info(`Starting import for group: ${input.groupName} (${input.groupId})`);

      // Step 1: Fetch all groups to get member details
      const groups = await getGroups(input.apiKey);
      const splitwiseGroup = groups.find((g) => g.id === input.groupId);

      if (!splitwiseGroup) {
        throw new Error(`Group not found: ${input.groupId}`);
      }

      // Step 2: Create or find users for all group members
      // Map Splitwise user ID to our DB user ID
      const splitwiseIdToDbId = new Map<number, number>();

      for (const member of splitwiseGroup.members) {
        let user = await ctx.db.user.findUnique({
          where: { email: member.email },
        });

        if (!user) {
          user = await ctx.db.user.create({
            data: {
              email: member.email,
              name: `${member.first_name}${member.last_name ? ` ${member.last_name}` : ''}`,
              image: member.picture?.medium,
              currency: 'INR', // Default, can be updated
            },
          });
          console.info(`Created user: ${user.email}`);
        }

        // Map Splitwise member ID to our DB user ID
        splitwiseIdToDbId.set(member.id, user.id);
        console.info(`Mapped Splitwise ID ${member.id} -> DB ID ${user.id} (${member.email})`);
      }

      // Step 3: Create group in SplitPro (or find existing)
      let group = await ctx.db.group.findUnique({
        where: { splitwiseGroupId: input.groupId.toString() },
      });

      if (group) {
        console.info(`Group already exists: ${group.name}`);

        // Update group name if it changed in Splitwise
        if (group.name !== splitwiseGroup.name) {
          await ctx.db.group.update({
            where: { id: group.id },
            data: { name: splitwiseGroup.name },
          });
          console.info(`Updated group name: ${group.name} -> ${splitwiseGroup.name}`);
        }

        // Add any new members that might not be in the group yet
        for (const member of splitwiseGroup.members) {
          const userId = splitwiseIdToDbId.get(member.id);
          if (userId) {
            const existingMember = await ctx.db.groupUser.findUnique({
              where: {
                groupId_userId: {
                  groupId: group.id,
                  userId: userId,
                },
              },
            });
            if (!existingMember) {
              await ctx.db.groupUser.create({
                data: {
                  groupId: group.id,
                  userId,
                },
              });
              console.info(`Added new member to existing group: ${member.email}`);
            }
          }
        }
      } else {
        group = await ctx.db.group.create({
          data: {
            name: splitwiseGroup.name,
            publicId: nanoid(10),
            userId: currentUserId,
            defaultCurrency: 'INR',
            splitwiseGroupId: input.groupId.toString(),
            simplifyDebts: splitwiseGroup.simplify_by_default,
            createdAt: new Date(splitwiseGroup.created_at),
          },
        });
        console.info(`Created group: ${group.name}`);

        // Add all members to the group
        for (const member of splitwiseGroup.members) {
          const userId = splitwiseIdToDbId.get(member.id);
          if (userId) {
            await ctx.db.groupUser.create({
              data: {
                groupId: group.id,
                userId,
              },
            });
          }
        }
        console.info(`Added ${splitwiseGroup.members.length} members to group`);
      }

      // Step 4: Fetch ALL expenses for this group
      console.info(`Fetching expenses for group: ${input.groupName}...`);
      const expenses = await getAllGroupExpenses(input.apiKey, input.groupId);
      console.info(`Fetched ${expenses.length} expenses`);

      // Step 5: Import expenses
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const expense of expenses) {
        // Skip deleted expenses
        if (expense.deleted_at) {
          skipped++;
          continue;
        }

        // Check for duplicates
        const existing = await ctx.db.expense.findFirst({
          where: {
            transactionId: `splitwise-api-${expense.id}`,
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Convert expense
        const converted = convertExpenseToSplitPro(expense, splitwiseIdToDbId, group.id);

        if (!converted) {
          errors.push(`Failed to convert: ${expense.description}`);
          continue;
        }

        // Create expense and participants in transaction
        try {
          await ctx.db.$transaction(async (tx) => {
            const createdExpense = await tx.expense.create({
              data: {
                name: converted.name,
                category: mapCategory(converted.category),
                amount: converted.amount,
                currency: converted.currency,
                splitType: converted.splitType,
                expenseDate: converted.expenseDate,
                createdAt: converted.createdAt,
                paidBy: converted.paidBy,
                addedBy: currentUserId,
                groupId: converted.groupId,
                transactionId: converted.transactionId,
              },
            });

            await tx.expenseParticipant.createMany({
              data: converted.participants.map((p) => ({
                expenseId: createdExpense.id,
                userId: p.userId,
                amount: p.amount,
              })),
            });
          });

          imported++;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          errors.push(`Error importing "${expense.description}": ${msg}`);
        }
      }

      console.info(`Import complete: ${imported} imported, ${skipped} skipped`);

      return {
        success: true,
        groupId: group.id,
        groupName: group.name,
        imported,
        skipped,
        total: expenses.length,
        errors: errors.slice(0, 10), // Return first 10 errors
      };
    }),
});
