import { type Group, SplitType, type User } from '@prisma/client';
import Router from 'next/router';
import { create } from 'zustand';

import { DEFAULT_CATEGORY } from '~/lib/category';
import { type CurrencyCode } from '~/lib/currency';
import { shuffleArray } from '~/utils/array';
import { BigMath, calculateExactRemainderDistribution } from '~/utils/numbers';

export type Participant = User & { amount?: bigint };
type SplitShares = Record<number, Record<SplitType, bigint | undefined>>;

export interface AddExpenseState {
  amount: bigint;
  amountStr: string;
  currentUser: User | undefined;
  splitType: SplitType;
  group: Group | undefined;
  participants: Participant[];
  splitShares: SplitShares;
  description: string;
  currency: CurrencyCode;
  category: string;
  nameOrEmail: string;
  paidBy: User | undefined;
  showFriends: boolean;
  isFileUploading: boolean;
  fileKey?: string;
  canSplitScreenClosed: boolean;
  splitScreenOpen: boolean;
  expenseDate: Date | undefined;
  actions: {
    setAmount: (amount: bigint) => void;
    setAmountStr: (amountStr: string) => void;
    setSplitType: (splitType: SplitType) => void;
    setGroup: (group: Group | undefined) => void;
    addOrUpdateParticipant: (user: Participant) => void;
    setSplitShare: (splitType: SplitType, userId: number, share: bigint) => void;
    setParticipants: (participants: Participant[], splitType?: SplitType) => void;
    removeParticipant: (userId: number) => void;
    removeLastParticipant: () => void;
    setCurrency: (currency: CurrencyCode) => void;
    setCategory: (category: string) => void;
    setNameOrEmail: (nameOrEmail: string) => void;
    setPaidBy: (user: User) => void;
    setCurrentUser: (user: User) => void;
    setDescription: (description: string) => void;
    setFileUploading: (isFileUploading: boolean) => void;
    setFileKey: (fileKey: string) => void;
    resetState: () => void;
    setSplitScreenOpen: (splitScreenOpen: boolean) => void;
    setExpenseDate: (expenseDate: Date | undefined) => void;
    distributeExactRemainderEqually: () => void;
  };
}

export const useAddExpenseStore = create<AddExpenseState>()((set) => ({
  amount: 0n,
  amountStr: '',
  splitType: SplitType.EQUAL,
  participants: [],
  group: undefined,
  splitShares: {
    [SplitType.EQUAL]: {},
    [SplitType.PERCENTAGE]: {},
    [SplitType.SHARE]: {},
    [SplitType.EXACT]: {},
    [SplitType.ADJUSTMENT]: {},
    [SplitType.SETTLEMENT]: {},
  },
  currency: 'USD',
  category: DEFAULT_CATEGORY,
  nameOrEmail: '',
  paidBy: undefined,
  currentUser: undefined,
  description: '',
  showFriends: true,
  isFileUploading: false,
  fileKey: undefined,
  canSplitScreenClosed: true,
  splitScreenOpen: false,
  expenseDate: undefined,
  actions: {
    setAmount: (amount) =>
      set((s) => ({
        amount,
        ...calculateParticipantSplit(amount, s.participants, s.splitType, s.splitShares, s.paidBy),
      })),
    setAmountStr: (amountStr) => set({ amountStr }),
    setSplitType: (splitType) =>
      set((state) => ({
        splitType,
        ...calculateParticipantSplit(
          state.amount,
          state.participants,
          splitType,
          state.splitShares,
          state.paidBy,
        ),
      })),
    setSplitShare: (splitType, userId, share) =>
      set((state) => {
        const splitShares: SplitShares = { ...state.splitShares };
        const userShares = splitShares[userId] ?? initSplitShares();
        userShares[splitType] = share;
        splitShares[userId] = userShares;
        return {
          ...calculateParticipantSplit(
            state.amount,
            state.participants,
            state.splitType,
            splitShares,
            state.paidBy,
          ),
          splitShares,
        };
      }),
    setGroup: (group) => {
      set({ group });
    },
    addOrUpdateParticipant: (user) =>
      set((state) => {
        const participants = [...state.participants];
        const splitShares = { ...state.splitShares };
        const userIndex = participants.findIndex((p) => p.id === user.id);
        if (-1 !== userIndex) {
          participants[userIndex] = user;
          splitShares[user.id] = initSplitShares();
        } else {
          participants.push({ ...user });
        }
        return calculateParticipantSplit(
          state.amount,
          participants,
          state.splitType,
          splitShares,
          state.paidBy,
        );
      }),
    setParticipants: (participants, splitType) =>
      set((state) => {
        const splitShares = participants.reduce((res, p) => {
          res[p.id] = initSplitShares();
          return res;
        }, {} as SplitShares);
        if (splitType) {
          calculateSplitShareBasedOnAmount(
            state.amount,
            participants,
            splitType,
            splitShares,
            state.paidBy,
          );
        } else {
          splitType = SplitType.EQUAL;
        }
        return {
          splitType,
          splitShares,
          ...calculateParticipantSplit(
            state.amount,
            participants,
            splitType,
            splitShares,
            state.paidBy,
          ),
        };
      }),
    removeLastParticipant: () => {
      set((state) => {
        const currentPath = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.delete('friendId');

        Router.push(`${currentPath}?${searchParams.toString()}`).catch(console.error);

        if (1 >= state.participants.length) {
          return {};
        }
        const newParticipants = [...state.participants];
        const { id } = newParticipants.pop()!;
        const { [id]: _, ...rest } = state.splitShares;
        return {
          ...calculateParticipantSplit(
            state.amount,
            newParticipants,
            state.splitType,
            rest,
            state.paidBy,
          ),
          splitShares: rest,
        };
      });
    },
    removeParticipant: (userId) => {
      set((state) => {
        const currentPath = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.delete('friendId');

        Router.push(`${currentPath}?${searchParams.toString()}`).catch(console.error);

        const newParticipants = state.participants.filter((p) => p.id !== userId);
        const { [userId]: _, ...rest } = state.splitShares;
        return {
          ...calculateParticipantSplit(
            state.amount,
            newParticipants,
            state.splitType,
            rest,
            state.paidBy,
          ),
          splitShares: rest,
        };
      });
    },
    setCurrency: (currency) => set({ currency }),
    setCategory: (category) => set({ category }),
    setNameOrEmail: (nameOrEmail) => set({ nameOrEmail, showFriends: 0 < nameOrEmail.length }),
    setPaidBy: (paidBy) =>
      set((s) => ({
        paidBy,
        ...calculateParticipantSplit(s.amount, s.participants, s.splitType, s.splitShares, paidBy),
      })),
    setCurrentUser: (currentUser) =>
      set((s) => {
        const cUser = s.participants.find((p) => p.id === currentUser.id);
        const participants = [...s.participants];

        if (!cUser) {
          participants.push(currentUser);
        }
        return { currentUser, paidBy: currentUser, participants };
      }),
    setDescription: (description) => set({ description }),
    setFileUploading: (isFileUploading) => set({ isFileUploading }),
    setFileKey: (fileKey) => set({ fileKey }),
    resetState: () => {
      set((s) => ({
        amount: 0n,
        participants: s.currentUser ? [s.currentUser] : [],
        description: '',
        fileKey: '',
        category: DEFAULT_CATEGORY,
        splitType: SplitType.EQUAL,
        group: undefined,
        amountStr: '',
        splitShares: s.currentUser ? { [s.currentUser.id]: initSplitShares() } : {},
      }));
    },
    setSplitScreenOpen: (splitScreenOpen) => set({ splitScreenOpen }),
    setExpenseDate: (expenseDate) => set({ expenseDate }),
    distributeExactRemainderEqually: () =>
      set((state) => {
        if (state.splitType !== SplitType.EXACT) {
          return {};
        }
        const amount = state.amount;
        if (0n === amount || state.participants.length === 0) {
          return {};
        }

        const splitShares: SplitShares = { ...state.splitShares };
        state.participants.forEach((p) => {
          splitShares[p.id] ??= initSplitShares();
        });

        const totalExact = state.participants.reduce(
          (acc, p) => acc + (splitShares[p.id]?.[SplitType.EXACT] ?? 0n),
          0n,
        );
        const remainder = amount - totalExact;
        if (remainder <= 0n) {
          return {};
        }

        const distributions = calculateExactRemainderDistribution(
          state.participants,
          splitShares,
          remainder
        );

        distributions.forEach((dist) => {
          splitShares[dist.participantId]![SplitType.EXACT] = dist.finalAmount;
        });

        return {
          ...calculateParticipantSplit(
            state.amount,
            state.participants,
            state.splitType,
            splitShares,
            state.paidBy,
          ),
          splitShares,
        };
      }),
  },
}));

export function calculateParticipantSplit(
  amount: bigint,
  participants: Participant[],
  splitType: SplitType,
  splitShares: SplitShares,
  paidBy?: Participant,
) {
  let canSplitScreenClosed = true;
  if (0n === amount) {
    return { participants, canSplitScreenClosed };
  }

  let updatedParticipants = participants;

  const getSplitShare = (p: Participant) => splitShares[p.id]?.[splitType];

  switch (splitType) {
    case SplitType.EQUAL:
      const totalParticipants = participants.filter((p) => 0n !== getSplitShare(p)).length;
      updatedParticipants = participants.map((p) => ({
        ...p,
        amount: 0n === getSplitShare(p) ? 0n : amount / BigInt(totalParticipants),
      }));
      canSplitScreenClosed = !!Object.values(splitShares).find((p) => 0n !== p[SplitType.EQUAL]);
      break;
    case SplitType.PERCENTAGE:
      updatedParticipants = participants.map((p) => ({
        ...p,
        amount: ((getSplitShare(p) ?? 0n) * amount) / 10000n,
      }));
      canSplitScreenClosed =
        0 === 100 - participants.reduce((acc, p) => acc + Number(getSplitShare(p) ?? 0n) / 100, 0);
      break;
    case SplitType.SHARE:
      const totalShare = participants.reduce((acc, p) => acc + Number(getSplitShare(p) ?? 0n), 0);
      canSplitScreenClosed = 0 < totalShare;
      updatedParticipants = participants.map((p) => ({
        ...p,
        amount:
          0n === (getSplitShare(p) ?? 0n)
            ? 0n
            : ((getSplitShare(p) ?? 0n) * amount) / BigInt(Math.round(totalShare)),
      }));
      break;
    case SplitType.EXACT:
      const totalSplitShare = participants.reduce((acc, p) => acc + (getSplitShare(p) ?? 0n), 0n);

      canSplitScreenClosed = amount === totalSplitShare;

      updatedParticipants = participants.map((p) => ({ ...p, amount: getSplitShare(p) }));
      break;
    case SplitType.ADJUSTMENT:
      const totalAdjustment = participants.reduce((acc, p) => acc + (getSplitShare(p) ?? 0n), 0n);
      if (totalAdjustment > amount) {
        canSplitScreenClosed = false;
      }
      const remainingAmountShare = (amount - totalAdjustment) / BigInt(participants.length);
      updatedParticipants = participants.map((p) => ({
        ...p,
        amount: remainingAmountShare + (getSplitShare(p) ?? 0n),
      }));
      break;
  }

  updatedParticipants = updatedParticipants.map((p) => {
    if (p.id === paidBy?.id) {
      return { ...p, amount: -(p.amount ?? 0n) + amount };
    }
    return { ...p, amount: -(p.amount ?? 0n) };
  });

  let penniesLeft = updatedParticipants.reduce((acc, p) => acc + (p.amount ?? 0n), 0n);
  const participantsToPick = updatedParticipants.filter((p) => p.amount);

  if (0 < participantsToPick.length) {
    shuffleArray(participantsToPick);
    let i = 0;
    while (0n !== penniesLeft) {
      const p = participantsToPick[i % participantsToPick.length]!;
      p.amount! -= BigMath.sign(penniesLeft);
      penniesLeft -= BigMath.sign(penniesLeft);
      i++;
    }
  }

  return { participants: updatedParticipants, canSplitScreenClosed };
}

export const initSplitShares = (): Record<SplitType, bigint | undefined> => ({
  [SplitType.EQUAL]: undefined,
  [SplitType.PERCENTAGE]: undefined,
  [SplitType.SHARE]: undefined,
  [SplitType.EXACT]: undefined,
  [SplitType.ADJUSTMENT]: undefined,
  [SplitType.SETTLEMENT]: undefined,
});

export function calculateSplitShareBasedOnAmount(
  amount: bigint,
  participants: Participant[],
  splitType: SplitType,
  splitShares: SplitShares,
  paidBy?: User,
) {
  switch (splitType) {
    case SplitType.EQUAL:
      participants.forEach((p) => {
        splitShares[p.id]![splitType] = 0n === p.amount && participants.length > 1 ? 0n : 1n;
      });

      break;

    case SplitType.PERCENTAGE:
      participants.forEach((p) => {
        splitShares[p.id]![splitType] =
          0n === amount
            ? 0n
            : paidBy?.id !== p.id
              ? (BigMath.abs(p.amount ?? 0n) * 10000n) / amount
              : (BigMath.abs(amount - (p.amount ?? 0n)) * 10000n) / amount;
      });

      break;

    case SplitType.SHARE:
      const amountNum = Number(amount);
      const shares = participants.map((p) =>
        p.id === paidBy?.id
          ? Math.abs(amountNum - Number(p.amount)) / amountNum
          : Math.abs(Number(p.amount)) / amountNum,
      );

      const minShare = Math.min(...shares);

      const multiplier = 0 !== minShare ? 1 / minShare : 1;

      participants.forEach((p) => {
        splitShares[p.id]![splitType] =
          0n === amount
            ? 0n
            : BigInt(
                Math.round(
                  (Math.abs(paidBy?.id !== p.id ? Number(p.amount) : amountNum - Number(p.amount)) /
                    amountNum) *
                    multiplier,
                ),
              ) * 100n;
      });

      break;

    case SplitType.EXACT:
      participants.forEach((p) => {
        splitShares[p.id]![splitType] =
          paidBy?.id !== p.id
            ? BigMath.abs(p.amount ?? 0n)
            : BigMath.abs(amount - (p.amount ?? 0n));
      });

      break;

    case SplitType.ADJUSTMENT:
      const minAmount = BigMath.min(
        ...participants
          .filter(({ amount }) => 0n !== amount)
          .map((p) =>
            p.id === paidBy?.id
              ? BigMath.abs(amount - (p.amount ?? 0n))
              : BigMath.abs(p.amount ?? 0n),
          ),
      );

      participants.forEach((p) => {
        splitShares[p.id]![splitType] =
          paidBy?.id !== p.id
            ? BigMath.abs(p.amount ?? 0n) - minAmount
            : amount - BigMath.abs(p.amount ?? 0n) - minAmount;
      });

      break;
  }
}
