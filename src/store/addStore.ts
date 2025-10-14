import { type Group, SplitType, type User } from '@prisma/client';
import Router from 'next/router';
import { create } from 'zustand';

import { DEFAULT_CATEGORY } from '~/lib/category';
import { type CurrencyCode } from '~/lib/currency';
import type { TransactionAddInputModel } from '~/types';
import { BigMath } from '~/utils/numbers';

export type Participant = User & { amount?: bigint };
type SplitShares = Record<number, Record<SplitType, bigint | undefined>>;

export interface AddExpenseState {
  amount: bigint;
  amountStr: string;
  isNegative: boolean;
  currentUser?: User;
  splitType: SplitType;
  group?: Group;
  participants: Participant[];
  splitShares: SplitShares;
  description: string;
  currency: CurrencyCode;
  category: string;
  nameOrEmail: string;
  paidBy?: User;
  showFriends: boolean;
  isFileUploading: boolean;
  fileKey?: string;
  canSplitScreenClosed: boolean;
  splitScreenOpen: boolean;
  expenseDate: Date;
  cronExpression: string;
  transactionId?: string;
  multipleTransactions: TransactionAddInputModel[];
  isTransactionLoading: boolean;
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
    setTransactionId: (transactionId?: string) => void;
    setMultipleTransactions: (multipleTransactions: TransactionAddInputModel[]) => void;
    setIsTransactionLoading: (isTransactionLoading: boolean) => void;
    setCronExpression: (cronExpression: string) => void;
  };
}

export const useAddExpenseStore = create<AddExpenseState>()((set) => ({
  amount: 0n,
  amountStr: '',
  isNegative: false,
  splitType: SplitType.EQUAL,
  participants: [],
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
  description: '',
  showFriends: true,
  isFileUploading: false,
  canSplitScreenClosed: true,
  splitScreenOpen: false,
  expenseDate: new Date(),
  repeatEvery: 1,
  multipleTransactions: [],
  isTransactionLoading: false,
  cronExpression: '',
  actions: {
    setAmount: (realAmount) =>
      set((s) => {
        const isNegative = realAmount < 0n;
        const amount = BigMath.abs(realAmount);
        return {
          amount,
          isNegative,
          ...calculateParticipantSplit(
            amount,
            s.participants,
            s.splitType,
            s.splitShares,
            s.paidBy,
            s.transactionId
          ),
        };
      }),
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
          state.transactionId
        ),
      })),
    setSplitShare: (splitType, userId, share) =>
      set((state) => {
        const splitShares: SplitShares = {
          ...state.splitShares,
          [userId]: {
            ...(state.splitShares[userId] ?? initSplitShares()),
            [splitType]: share,
          },
        } as SplitShares;

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
        } else {
          participants.push({ ...user });
          splitShares[user.id] = initSplitShares();
        }
        return {
          splitShares,
          ...calculateParticipantSplit(
            state.amount,
            participants,
            state.splitType,
            splitShares,
            state.paidBy,
            state.transactionId
          ),
        };
      }),
    setParticipants: (participants, splitType) =>
      set((state) => {
        const splitShares = participants.reduce<SplitShares>((res, p) => {
          res[p.id] = initSplitShares();
          return res;
        }, {});
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
            state.transactionId
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
        const splitShares = { ...s.splitShares };
        const participants = [...s.participants];

        if (!cUser) {
          participants.push(currentUser);
        }
        if (!splitShares[currentUser.id]) {
          splitShares[currentUser.id] = initSplitShares();
        }
        return { currentUser, splitShares, paidBy: currentUser, participants };
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
        isNegative: false,
        canSplitScreenClosed: true,
        splitScreenOpen: false,
        expenseDate: new Date(),
        transactionId: undefined,
        multipleTransactions: [],
        isTransactionLoading: false,
        cronExpression: '',
        isFileUploading: false,
        paidBy: s.currentUser,
      }));
    },
    setSplitScreenOpen: (splitScreenOpen) => set({ splitScreenOpen }),
    setExpenseDate: (expenseDate) => set({ expenseDate }),
    setTransactionId: (transactionId) => set({ transactionId }),
    setMultipleTransactions: (multipleTransactions) => set({ multipleTransactions }),
    setIsTransactionLoading: (isTransactionLoading) => set({ isTransactionLoading }),
    setCronExpression: (cronExpression) => set({ cronExpression }),
  },
}));

export function calculateParticipantSplit(
  amount: bigint,
  participants: Participant[],
  splitType: SplitType,
  splitShares: SplitShares,
  paidBy?: Participant,
  transactionId: string = ''
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
    
    const hash = (value: number, inputs: { amount: bigint; transactionId: string }): number => {
      let hash = 5381;

      // Hash the transactionId first to give it more weight
      for (let i = 0; i < inputs.transactionId.length; i++) {
        const char = inputs.transactionId.charCodeAt(i);
        hash = ((hash << 5) + hash) + char;
        hash = hash & hash;
      }

      // Multiply by a large prime to amplify the transaction ID's influence
      hash *= 31;

      // Then add amount's influence
      const amountStr = inputs.amount.toString();
      const lastDigits = amountStr.slice(-6);
      for (let i = 0; i < lastDigits.length; i++) {
        const char = lastDigits.charCodeAt(i);
        hash = ((hash << 5) + hash) + char;
        hash = hash & hash;
      }

      // Finally add participant's influence
      hash = ((hash << 5) + hash) + value;
      hash = hash & hash;
      
      return Math.abs(hash);
    };
    
    const shuffled = [...participantsToPick].sort((a, b) => {
      const hashA = hash(a.id, { amount, transactionId });
      const hashB = hash(b.id, { amount, transactionId });
      return hashA - hashB;
    });
    
    let i = 0;
    while (0n !== penniesLeft) {
      const p = shuffled[i % shuffled.length]!;
      p.amount! -= BigMath.sign(penniesLeft);
      penniesLeft -= BigMath.sign(penniesLeft);
      i++;
    }
  }

  return { participants: updatedParticipants, canSplitScreenClosed };
}

export const initSplitShares = (): Record<SplitType, undefined> =>
  // @ts-expect-error TS enums/string coersion *eyeroll*
  Object.fromEntries(Object.values(SplitType).map((type) => [type, undefined]));

export function calculateSplitShareBasedOnAmount(
  amount: bigint,
  participants: Participant[],
  splitType: SplitType,
  splitShares: SplitShares,
  paidBy?: User
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
