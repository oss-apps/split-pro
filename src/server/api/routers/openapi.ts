import { SplitType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { simplifyDebts } from '~/lib/simplify';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { db } from '~/server/db';
import { createExpense, deleteExpense, editExpense } from '../services/splitService';

import type { CreateExpense as CreateExpenseType } from '~/types/expense.types';

const userOutputSchema = z.object({
  id: z.number(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  currency: z.string(),
});

const MAX_API_KEY_FRIENDS_PER_PAGE = 50;

const validateGroupMembership = async (groupId: number, userId: number, participants: number[]) => {
  const userIds = [userId, ...participants].filter(Boolean);
  const groupUsers = await db.groupUser.findMany({
    where: {
      groupId,
      userId: { in: userIds },
    },
    select: { userId: true },
  });

  const memberIds = new Set(groupUsers.map((gu) => gu.userId));

  if (!memberIds.has(userId)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a member of this group' });
  }

  for (const participantId of participants) {
    if (!memberIds.has(participantId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `User ${participantId} is not a member of this group`,
      });
    }
  }
};

const validateEditExpensePermission = async (expenseId: string, userId: number) => {
  const [expenseParticipant, addedBy] = await Promise.all([
    db.expenseParticipant.findUnique({
      where: {
        expenseId_userId: {
          expenseId,
          userId,
        },
      },
    }),
    db.expense.findUnique({ where: { id: expenseId }, select: { addedBy: true } }),
  ]);

  if (!expenseParticipant && addedBy?.addedBy !== userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You are not a participant of this expense',
    });
  }
};

const mapRestToServiceInput = (
  input: {
    expenseName: string;
    amount: number;
    currency: string;
    expenseDate?: string;
    category: string;
    groupId: number | null;
    paidById: number;
    splitMethod: string;
    participants: { userId: number; share?: number }[];
  },
  expenseId?: string,
): CreateExpenseType & { expenseId?: string } => {
  const participantCount = input.participants.length;
  const equalShare =
    input.splitMethod === SplitType.EQUAL && participantCount > 0
      ? BigInt(input.amount) / BigInt(participantCount)
      : null;

  return {
    ...(expenseId ? { expenseId } : {}),
    name: input.expenseName,
    amount: BigInt(input.amount),
    currency: input.currency,
    category: input.category,
    groupId: input.groupId,
    paidBy: input.paidById,
    splitType: input.splitMethod as SplitType,
    expenseDate: input.expenseDate ? new Date(input.expenseDate) : new Date(),
    participants: input.participants.map((p) => ({
      userId: p.userId,
      amount: null !== equalShare ? equalShare : p.share !== undefined ? BigInt(p.share) : 0n,
    })),
  };
};

export const openApiRouter = createTRPCRouter({
  me: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/me',
        summary: 'Get current authenticated user',
        tags: ['User'],
        protect: true,
      },
    })
    .input(z.object({}))
    .output(userOutputSchema)
    .query(({ ctx }) => ctx.session.user),

  getFriends: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/friends',
        summary: 'List friends with balances',
        tags: ['User'],
        protect: true,
      },
    })
    .input(z.object({}))
    .output(
      z.array(
        z.object({
          id: z.number(),
          name: z.string().nullable(),
          email: z.string().nullable(),
          image: z.string().nullable(),
          balance: z.number(),
          currency: z.string(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const rawBalances = await db.balanceView.findMany({
        where: {
          userId: ctx.session.user.id,
          friendId: { notIn: ctx.session.user.hiddenFriendIds },
        },
        include: {
          group: {
            select: {
              simplifyDebts: true,
            },
          },
        },
      });

      const processedBalances = await Promise.all(
        rawBalances.map(async ({ friendId, currency, amount, groupId, group }) => {
          if (!group?.simplifyDebts || null === groupId) {
            return { friendId, currency, amount };
          }

          const allGroupBalances = await db.balanceView.findMany({
            where: { groupId, currency },
          });

          const simplified = simplifyDebts(allGroupBalances);
          const simplifiedBalance = simplified.find(
            (b) =>
              b.userId === ctx.session.user.id &&
              b.friendId === friendId &&
              b.currency === currency,
          );

          return { friendId, currency, amount: simplifiedBalance?.amount ?? 0n };
        }),
      );

      const aggregated = processedBalances.reduce<Map<number, Map<string, bigint>>>(
        (acc, { friendId, currency, amount }) => {
          if (!acc.has(friendId)) {
            acc.set(friendId, new Map());
          }
          const friendMap = acc.get(friendId)!;
          friendMap.set(currency, (friendMap.get(currency) ?? 0n) + amount);
          return acc;
        },
        new Map(),
      );

      const friendIds = [...aggregated.keys()];
      const users = await db.user.findMany({
        where: { id: { in: friendIds } },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

      const result = [];
      for (const [friendId, currencies] of aggregated) {
        const user = userMap[friendId];
        if (!user) continue;

        for (const [currency, amount] of currencies) {
          if (0n !== amount) {
            result.push({
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
              balance: Number(amount),
              currency,
            });
          }
        }
      }

      return result;
    }),

  getAllGroups: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/groups',
        summary: 'List all groups',
        tags: ['Group'],
        protect: true,
      },
    })
    .input(z.object({}))
    .output(
      z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          currency: z.string(),
          memberCount: z.number(),
          simplifyDebt: z.boolean(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const groups = await db.group.findMany({
        where: {
          groupUsers: {
            some: {
              userId: ctx.session.user.id,
            },
          },
        },
        include: {
          _count: {
            select: { groupUsers: true },
          },
        },
      });

      return groups.map((g) => ({
        id: g.id,
        name: g.name,
        currency: g.defaultCurrency ?? '',
        memberCount: g._count.groupUsers,
        simplifyDebt: g.simplifyDebts,
      }));
    }),

  getGroupDetails: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/groups/{id}',
        summary: 'Get group with members',
        tags: ['Group'],
        protect: true,
      },
    })
    .input(z.object({ id: z.number() }))
    .output(
      z.object({
        id: z.number(),
        name: z.string(),
        currency: z.string(),
        simplifyDebt: z.boolean(),
        members: z.array(
          z.object({
            id: z.number(),
            name: z.string().nullable(),
            email: z.string().nullable(),
          }),
        ),
      }),
    )
    .query(async ({ input }) => {
      const group = await db.group.findUnique({
        where: { id: input.id },
        include: {
          groupUsers: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!group) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
      }

      return {
        id: group.id,
        name: group.name,
        currency: group.defaultCurrency ?? '',
        simplifyDebt: group.simplifyDebts,
        members: group.groupUsers.map((gu) => ({
          id: gu.user.id,
          name: gu.user.name,
          email: gu.user.email,
        })),
      };
    }),

  getGroupBalances: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/groups/{id}/balances',
        summary: 'Get group balances',
        tags: ['Group'],
        protect: true,
      },
    })
    .input(z.object({ id: z.number() }))
    .output(
      z.object({
        groupId: z.number(),
        balances: z.array(
          z.object({
            userId: z.number(),
            userName: z.string().nullable(),
            netBalance: z.number(),
          }),
        ),
      }),
    )
    .query(async ({ input }) => {
      const [rawBalances, group] = await Promise.all([
        db.balanceView.findMany({
          where: { groupId: input.id },
          include: { user: true },
        }),
        db.group.findUnique({
          where: { id: input.id },
          select: { simplifyDebts: true },
        }),
      ]);

      const simplified = group?.simplifyDebts ? simplifyDebts(rawBalances) : [...rawBalances];

      const userIds = [...new Set(simplified.map((b) => b.friendId ?? b.userId))];

      const aggregated = userIds.map((userId) => {
        const user = rawBalances.find((b) => b.userId === userId)?.user;
        const balance = simplified
          .filter((b) => b.userId === userId && b.friendId !== null)
          .reduce((sum, b) => sum + b.amount, 0n);

        return {
          userId,
          userName: user?.name ?? null,
          netBalance: Number(balance),
        };
      });

      return { groupId: input.id, balances: aggregated };
    }),

  getGroupExpenses: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/groups/{id}/expenses',
        summary: 'List group expenses',
        tags: ['Expense'],
        protect: true,
      },
    })
    .input(
      z.object({
        id: z.number(),
        since: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(MAX_API_KEY_FRIENDS_PER_PAGE).default(20),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .output(
      z.object({
        expenses: expenseOutputSchemaArray(),
        total: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const { id, since, limit, offset } = input;

      const where = {
        groupId: id,
        deletedBy: null,
        ...(since ? { expenseDate: { gte: new Date(since) } } : {}),
      };

      const [expenses, total] = await Promise.all([
        db.expense.findMany({
          where,
          include: {
            expenseParticipants: true,
            paidByUser: true,
            group: true,
            deletedByUser: true,
          },
          orderBy: { expenseDate: 'desc' },
          skip: offset,
          take: limit,
        }),
        db.expense.count({ where }),
      ]);

      return { expenses: expenses.map(normalizeExpense), total };
    }),

  getExpenses: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/expenses',
        summary: 'List expenses across groups',
        tags: ['Expense'],
        protect: true,
      },
    })
    .input(
      z.object({
        groupId: z.number().optional(),
        since: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(MAX_API_KEY_FRIENDS_PER_PAGE).default(20),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .output(
      z.object({
        expenses: expenseOutputSchemaArray(),
        total: z.number(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { groupId, since, limit, offset } = input;

      const expenseWhere = {
        deletedBy: null,
        ...(groupId
          ? { groupId, group: { groupUsers: { some: { userId: ctx.session.user.id } } } }
          : {
              expenseParticipants: {
                some: { userId: ctx.session.user.id },
              },
            }),
        ...(since ? { expenseDate: { gte: new Date(since) } } : {}),
      };

      const [expenseParticipants, total] = await Promise.all([
        db.expenseParticipant.findMany({
          where: { expense: expenseWhere },
          orderBy: { expense: { expenseDate: 'desc' } },
          skip: offset,
          take: limit,
          include: {
            expense: {
              include: {
                expenseParticipants: true,
                paidByUser: true,
                group: true,
                deletedByUser: true,
              },
            },
          },
        }),
        db.expense.count({ where: expenseWhere }),
      ]);

      return {
        expenses: expenseParticipants.map((ep) => normalizeExpense(ep.expense)),
        total,
      };
    }),

  getExpenseDetails: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/expenses/{id}',
        summary: 'Get single expense',
        tags: ['Expense'],
        protect: true,
      },
    })
    .input(z.object({ id: z.string() }))
    .output(expenseDetailSchema())
    .query(async ({ input, ctx }) => {
      await validateEditExpensePermission(input.id, ctx.session.user.id);

      const expense = await db.expense.findUnique({
        where: { id: input.id },
        include: {
          expenseParticipants: {
            include: {
              user: true,
            },
          },
          expenseNotes: true,
          addedByUser: true,
          paidByUser: true,
          group: true,
        },
      });

      if (!expense) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Expense not found' });
      }

      return normalizeExpenseDetail(expense);
    }),

  createExpense: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/expenses',
        summary: 'Create expense',
        tags: ['Expense'],
        protect: true,
      },
    })
    .input(expenseInputSchema())
    .output(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (null !== input.groupId) {
        const allParticipantIds = input.participants.map((p) => p.userId);
        await validateGroupMembership(input.groupId, ctx.session.user.id, [
          input.paidById,
          ...allParticipantIds,
        ]);
      }

      const serviceInput = mapRestToServiceInput(input);
      const { notes } = input;

      const expense = await createExpense(serviceInput, ctx.session.user.id);

      if (notes) {
        await db.expenseNote.create({
          data: {
            note: notes,
            createdById: ctx.session.user.id,
            expenseId: expense.id,
          },
        });
      }

      return { id: expense.id };
    }),

  updateExpense: protectedProcedure
    .meta({
      openapi: {
        method: 'PUT',
        path: '/expenses/{id}',
        summary: 'Update expense',
        tags: ['Expense'],
        protect: true,
      },
    })
    .input(z.object({ id: z.string() }).merge(expenseInputSchema()))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      await validateEditExpensePermission(id, ctx.session.user.id);

      if (null !== data.groupId) {
        const allParticipantIds = data.participants.map((p) => p.userId);
        await validateGroupMembership(data.groupId, ctx.session.user.id, [
          data.paidById,
          ...allParticipantIds,
        ]);
      }

      const serviceInput = mapRestToServiceInput(data, id);
      const { notes } = data;

      await editExpense(serviceInput, ctx.session.user.id);

      if (notes) {
        await db.expenseNote.deleteMany({ where: { expenseId: id } });
        await db.expenseNote.create({
          data: {
            note: notes,
            createdById: ctx.session.user.id,
            expenseId: id,
          },
        });
      }

      return { id };
    }),

  deleteExpense: protectedProcedure
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/expenses/{id}',
        summary: 'Delete expense',
        tags: ['Expense'],
        protect: true,
      },
    })
    .input(z.object({ id: z.string() }))
    .output(z.object({}))
    .mutation(async ({ input, ctx }) => {
      await validateEditExpensePermission(input.id, ctx.session.user.id);
      await deleteExpense(input.id, ctx.session.user.id);
    }),
});

function expenseOutputSchemaArray() {
  return z.array(expenseOutputSchema());
}

function expenseOutputSchema() {
  return z.object({
    id: z.string(),
    expenseName: z.string(),
    amount: z.number(),
    currency: z.string(),
    expenseDate: z.string().datetime(),
    category: z.string(),
    paidBy: z.object({
      id: z.number(),
      name: z.string().nullable(),
    }),
    splitMethod: z.string(),
    participants: z.array(
      z.object({
        userId: z.number(),
        share: z.number().nullable(),
      }),
    ),
    groupId: z.number().nullable(),
    isReimbursement: z.boolean(),
  });
}

function expenseDetailSchema() {
  return expenseOutputSchema().extend({
    notes: z.string().nullable(),
    addedBy: z.object({
      id: z.number(),
      name: z.string().nullable(),
    }),
  });
}

function expenseInputSchema() {
  return z.object({
    expenseName: z.string(),
    amount: z.number().int(),
    currency: z.string(),
    expenseDate: z.string().datetime().optional(),
    category: z.string(),
    notes: z.string().optional(),
    groupId: z.number().nullable(),
    paidById: z.number(),
    splitMethod: z.enum([
      SplitType.ADJUSTMENT,
      SplitType.EQUAL,
      SplitType.PERCENTAGE,
      SplitType.SHARE,
      SplitType.EXACT,
      SplitType.SETTLEMENT,
    ]),
    participants: z.array(
      z.object({
        userId: z.number(),
        share: z.number().int().optional(),
      }),
    ),
  });
}

function normalizeExpense(expense: {
  id: string;
  name: string;
  amount: bigint;
  currency: string;
  expenseDate: Date;
  category: string;
  splitType: SplitType;
  groupId: number | null;
  paidByUser: { id: number; name: string | null } | null;
  expenseParticipants: { userId: number; amount: bigint }[];
}) {
  return {
    id: expense.id,
    expenseName: expense.name,
    amount: Number(expense.amount),
    currency: expense.currency,
    expenseDate: expense.expenseDate.toISOString(),
    category: expense.category,
    paidBy: {
      id: expense.paidByUser?.id ?? 0,
      name: expense.paidByUser?.name ?? null,
    },
    splitMethod: expense.splitType,
    participants: expense.expenseParticipants.map((ep) => ({
      userId: ep.userId,
      share: Number(ep.amount),
    })),
    groupId: expense.groupId,
    isReimbursement: SplitType.SETTLEMENT === expense.splitType,
  };
}

function normalizeExpenseDetail(expense: {
  id: string;
  name: string;
  amount: bigint;
  currency: string;
  expenseDate: Date;
  category: string;
  splitType: SplitType;
  groupId: number | null;
  expenseNotes: { note: string }[];
  paidByUser: { id: number; name: string | null } | null;
  addedByUser: { id: number; name: string | null } | null;
  expenseParticipants: { userId: number; amount: bigint }[];
}) {
  return {
    ...normalizeExpense(expense),
    notes: expense.expenseNotes[0]?.note ?? null,
    addedBy: {
      id: expense.addedByUser?.id ?? 0,
      name: expense.addedByUser?.name ?? null,
    },
  };
}

export type OpenApiRouter = typeof openApiRouter;
