import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { protectedProcedure } from '~/server/api/trpc';
import { sendPushNotificationToUsers } from './notificationService';

const commentInput = z.object({ expenseId: z.string().uuid() });
const noteInput = z.string().trim().min(1).max(5000);

// Apply the same visibility rules as expense details, before exposing or mutating comments.
const commentProcedure = protectedProcedure
  .input(commentInput)
  .use(async ({ ctx, input, next }) => {
    const expense = await ctx.db.expense.findFirst({
      where: {
        id: input.expenseId,
        OR: [
          { addedBy: ctx.session.user.id },
          { paidBy: ctx.session.user.id },
          { expenseParticipants: { some: { userId: ctx.session.user.id } } },
          { group: { groupUsers: { some: { userId: ctx.session.user.id } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        deletedBy: true,
        paidBy: true,
        expenseParticipants: { select: { userId: true } },
      },
    });
    if (!expense) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Expense not found' });
    }
    if (null !== expense.deletedBy) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Expense has been deleted' });
    }
    return next({ ctx: { ...ctx, expense } });
  });

export const commentProcedures = {
  addComment: commentProcedure
    .input(z.object({ note: noteInput }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.expenseNote.create({
        data: { expenseId: input.expenseId, note: input.note, createdById: ctx.session.user.id },
      });
      const recipients = [
        ...new Set([ctx.expense.paidBy, ...ctx.expense.expenseParticipants.map((p) => p.userId)]),
      ].filter((id) => id !== ctx.session.user.id);
      await sendPushNotificationToUsers(recipients, {
        title: ctx.session.user.name ?? ctx.session.user.email ?? '',
        message: `Commented on ${ctx.expense.name.slice(0, 100)}: ${input.note.slice(0, 200)}`,
        data: { url: `/expenses/${input.expenseId}` },
      }).catch(console.error);
      return comment;
    }),
  editComment: commentProcedure
    .input(z.object({ commentId: z.string(), note: noteInput }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.expenseNote.updateMany({
        where: {
          id: input.commentId,
          expenseId: input.expenseId,
          createdById: ctx.session.user.id,
        },
        data: { note: input.note },
      });
      if (0 === result.count) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Comment not found' });
      }
    }),
  deleteComment: commentProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.expenseNote.deleteMany({
        where: {
          id: input.commentId,
          expenseId: input.expenseId,
          createdById: ctx.session.user.id,
        },
      });
      if (0 === result.count) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Comment not found' });
      }
    }),
};
