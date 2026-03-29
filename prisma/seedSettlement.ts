import type { PrismaClient } from '@prisma/client';
import { SplitType } from '@prisma/client';

import { type SettleupCandidate } from '~/dummies/expenseGenerator';
import { createExpense } from '~/server/api/services/splitService';
import { DEFAULT_CATEGORY } from '~/lib/category';
import { BigMath } from '~/utils/numbers';

interface BalanceAtDate {
  userId: number;
  friendId: number;
  groupId: number | null;
  currency: string;
  amount: bigint;
}

interface ExpenseForSettlement {
  groupId: number | null;
  currency: string;
  paidBy: number;
  createdAt: Date;
  expenseParticipants: {
    userId: number;
  }[];
}

interface TimeWindow {
  from: Date;
  to: Date;
  count: number;
}

interface SettlementEvent {
  at: Date;
  kind: 'group' | 'direct';
  groupId: number | null;
  directKey: string | null;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizePair = (userA: number, userB: number) =>
  userA < userB ? ([userA, userB] as const) : ([userB, userA] as const);

const toCandidateKey = (
  userId: number,
  friendId: number,
  groupId: number | null,
  currency: string,
  kind: 'group' | 'direct',
) => {
  const [left, right] = normalizePair(userId, friendId);
  return [kind, left, right, groupId ?? 'null', currency].join('-');
};

const toDirectWindowKey = (userId: number, friendId: number, currency: string) => {
  const [left, right] = normalizePair(userId, friendId);
  return `${left}-${right}-${currency}`;
};

const buildDatesFromWindow = (window: TimeWindow, targetCount: number) => {
  const fromMs = window.from.getTime();
  const toMs = window.to.getTime();

  if (fromMs >= toMs) {
    return [new Date(fromMs)];
  }

  const totalMs = toMs - fromMs;
  const uniqueDates: Date[] = [];
  const seen = new Set<number>();

  for (let i = 1; i <= targetCount; i++) {
    const ratio = i / (targetCount + 1);
    const lateBiasedRatio = ratio ** 0.75;
    const timestamp = Math.floor(fromMs + totalMs * lateBiasedRatio) + i;

    if (seen.has(timestamp)) {
      // oxlint-disable-next-line no-continue
      continue;
    }

    seen.add(timestamp);
    uniqueDates.push(new Date(timestamp));
  }

  if (0 === uniqueDates.length) {
    return [new Date(fromMs + 1)];
  }

  return uniqueDates.sort((a, b) => a.getTime() - b.getTime());
};

const buildWindows = (expenses: ExpenseForSettlement[]) => {
  const groupWindows = new Map<number, TimeWindow>();
  const directWindows = new Map<string, TimeWindow>();

  expenses.forEach((expense) => {
    if (null !== expense.groupId) {
      const existing = groupWindows.get(expense.groupId);
      if (!existing) {
        groupWindows.set(expense.groupId, {
          from: expense.createdAt,
          to: expense.createdAt,
          count: 1,
        });
        return;
      }

      groupWindows.set(expense.groupId, {
        from:
          existing.from.getTime() < expense.createdAt.getTime() ? existing.from : expense.createdAt,
        to: existing.to.getTime() > expense.createdAt.getTime() ? existing.to : expense.createdAt,
        count: existing.count + 1,
      });
      return;
    }

    const participants = expense.expenseParticipants
      .map((participant) => participant.userId)
      .filter((participantId) => participantId !== expense.paidBy)
      .map((participantId) => toDirectWindowKey(expense.paidBy, participantId, expense.currency));

    participants.forEach((windowKey) => {
      const existing = directWindows.get(windowKey);
      if (!existing) {
        directWindows.set(windowKey, {
          from: expense.createdAt,
          to: expense.createdAt,
          count: 1,
        });
        return;
      }

      directWindows.set(windowKey, {
        from:
          existing.from.getTime() < expense.createdAt.getTime() ? existing.from : expense.createdAt,
        to: existing.to.getTime() > expense.createdAt.getTime() ? existing.to : expense.createdAt,
        count: existing.count + 1,
      });
    });
  });

  return { groupWindows, directWindows };
};

const buildSettlementEvents = (
  candidates: SettleupCandidate[],
  windows: ReturnType<typeof buildWindows>,
) => {
  const events: SettlementEvent[] = [];
  const groupIds = new Set(
    candidates
      .filter((candidate) => 'group' === candidate.kind)
      .map((candidate) => candidate.groupId),
  );

  groupIds.forEach((groupId) => {
    if (null === groupId) {
      return;
    }

    const window = windows.groupWindows.get(groupId);
    if (!window) {
      return;
    }

    const eventCount = clamp(Math.floor(window.count / 20), 1, 6);
    const dates = buildDatesFromWindow(window, eventCount);

    dates.forEach((date) => {
      events.push({
        at: date,
        kind: 'group',
        groupId,
        directKey: null,
      });
    });
  });

  candidates
    .filter((candidate) => 'direct' === candidate.kind)
    .forEach((candidate) => {
      const directKey = toDirectWindowKey(candidate.userId, candidate.friendId, candidate.currency);
      const window = windows.directWindows.get(directKey);
      if (!window) {
        return;
      }

      const eventCount = clamp(Math.floor(window.count / 15), 1, 4);
      const dates = buildDatesFromWindow(window, eventCount);

      dates.forEach((date) => {
        events.push({
          at: date,
          kind: 'direct',
          groupId: null,
          directKey,
        });
      });
    });

  return events.sort((left, right) => left.at.getTime() - right.at.getTime());
};

export const settleBalances = async (
  prisma: PrismaClient,
  settleCandidates: SettleupCandidate[],
) => {
  const candidateMap = new Map(
    settleCandidates.map((candidate) => [
      toCandidateKey(
        candidate.userId,
        candidate.friendId,
        candidate.groupId,
        candidate.currency,
        candidate.kind,
      ),
      candidate,
    ]),
  );

  const expenses = await prisma.expense.findMany({
    where: {
      deletedAt: null,
      splitType: {
        not: SplitType.SETTLEMENT,
      },
    },
    select: {
      groupId: true,
      currency: true,
      paidBy: true,
      createdAt: true,
      expenseParticipants: {
        select: {
          userId: true,
        },
      },
    },
  });

  const windows = buildWindows(expenses);
  const events = buildSettlementEvents(settleCandidates, windows);

  await events.reduce<Promise<void>>(async (eventChain, event) => {
    await eventChain;

    const balancesAtDate = await prisma.$queryRaw<BalanceAtDate[]>`
      SELECT "userId", "friendId", "groupId", currency, amount
      FROM get_balance_at_date(${event.at})
      WHERE amount != 0
        AND "userId" < "friendId"
    `;

    const relevantBalances = balancesAtDate.filter((balance) => {
      if ('group' === event.kind && event.groupId !== balance.groupId) {
        return false;
      }

      if ('direct' === event.kind) {
        if (null !== balance.groupId) {
          return false;
        }

        const directKey = toDirectWindowKey(balance.userId, balance.friendId, balance.currency);
        return event.directKey === directKey;
      }

      return true;
    });

    await Promise.all(
      relevantBalances.map(async (balance) => {
        const candidateKind = null === balance.groupId ? 'direct' : 'group';
        const key = toCandidateKey(
          balance.userId,
          balance.friendId,
          balance.groupId,
          balance.currency,
          candidateKind,
        );

        const candidate = candidateMap.get(key);
        if (!candidate || 0n === balance.amount) {
          return;
        }

        const sender = 0n > balance.amount ? candidate.friendId : candidate.userId;
        const receiver = 0n > balance.amount ? candidate.userId : candidate.friendId;

        const settlementExpense = await createExpense(
          {
            name: 'Settle up',
            amount: BigMath.abs(balance.amount),
            currency: balance.currency,
            splitType: SplitType.SETTLEMENT,
            groupId: balance.groupId,
            participants: [
              {
                userId: sender,
                amount: balance.amount,
              },
              {
                userId: receiver,
                amount: -balance.amount,
              },
            ],
            paidBy: sender,
            category: DEFAULT_CATEGORY,
            expenseDate: event.at,
          },
          sender,
        );

        await prisma.expense.update({
          where: {
            id: settlementExpense.id,
          },
          data: {
            createdAt: event.at,
          },
        });
      }),
    );
  }, Promise.resolve());

  console.log('Finished settling balances');
};
