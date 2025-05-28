import { type Group, SplitType, type User } from '@prisma/client';
import Router from 'next/router';
import { create } from 'zustand';

import { shuffleArray } from '~/utils/array';
import { BigMath } from '~/utils/numbers';

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
  currency: string;
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
    setParticipants: (participants: User[]) => void;
    removeParticipant: (userId: number) => void;
    removeLastParticipant: () => void;
    setCurrency: (currency: string) => void;
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
  category: 'general',
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
      set((s) => {
        const { participants, canSplitScreenClosed } = calculateParticipantSplit(
          amount,
          s.participants,
          s.splitType,
          s.splitShares,
          s.paidBy,
        );

        return { amount, participants, canSplitScreenClosed };
      }),
    setAmountStr: (amountStr) => set({ amountStr }),
    setSplitType: (splitType) =>
      set((state) => {
        return {
          splitType,
          ...calculateParticipantSplit(
            state.amount,
            state.participants,
            splitType,
            state.splitShares,
            state.paidBy,
          ),
        };
      }),
    setSplitShare: (splitType, userId, share) =>
      set((state) => {
        const splitShares = {
          ...state.splitShares,
          [userId]: {
            ...state.splitShares[userId],
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
        if (userIndex !== -1) {
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
    setParticipants: (participants) =>
      set((state) => {
        const splitShares = participants.reduce((res, p) => {
          res[p.id] = initSplitShares();
          return res;
        }, {} as SplitShares);
        return {
          splitType: SplitType.EQUAL,
          splitShares,
          ...calculateParticipantSplit(
            state.amount,
            participants,
            SplitType.EQUAL,
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

        if (state.participants.length <= 1) return {};
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
    setNameOrEmail: (nameOrEmail) => set({ nameOrEmail, showFriends: nameOrEmail.length > 0 }),
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
        category: 'general',
        splitType: SplitType.EQUAL,
        group: undefined,
        amountStr: '',
        splitShares: s.currentUser ? { [s.currentUser.id]: initSplitShares() } : {},
      }));
    },
    setSplitScreenOpen: (splitScreenOpen) => set({ splitScreenOpen }),
    setExpenseDate: (expenseDate) => set({ expenseDate }),
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
  if (amount === 0n) return { participants, canSplitScreenClosed };

  let updatedParticipants = participants;

  const getSplitShare = (p: User) => splitShares[p.id]?.[splitType];

  switch (splitType) {
    case SplitType.EQUAL:
      const totalParticipants = participants.filter((p) => getSplitShare(p) !== 0n).length;
      updatedParticipants = participants.map((p) => ({
        ...p,
        amount: getSplitShare(p) === 0n ? 0n : amount / BigInt(totalParticipants),
      }));
      canSplitScreenClosed = !!Object.values(splitShares).find((p) => p[SplitType.EQUAL] !== 0n);
      break;
    case SplitType.PERCENTAGE:
      updatedParticipants = participants.map((p) => ({
        ...p,
        amount: ((getSplitShare(p) ?? 0n) * amount) / 10000n,
      }));
      canSplitScreenClosed =
        100 - participants.reduce((acc, p) => acc + Number(getSplitShare(p) ?? 0n) / 100, 0) === 0;
      break;
    case SplitType.SHARE:
      const totalShare = participants.reduce((acc, p) => acc + Number(getSplitShare(p) ?? 0n), 0);
      canSplitScreenClosed = totalShare > 0;
      updatedParticipants = participants.map((p) => ({
        ...p,
        amount:
          (getSplitShare(p) ?? 0n) === 0n
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

  if (participantsToPick.length > 0) {
    shuffleArray(participantsToPick);
    let i = 0;
    while (penniesLeft !== 0n) {
      const p = participantsToPick[i % participantsToPick.length]!;
      p.amount! -= BigMath.sign(penniesLeft);
      penniesLeft -= BigMath.sign(penniesLeft);
      i++;
    }
  }

  return { participants: updatedParticipants, canSplitScreenClosed };
}

const initSplitShares = (): Record<SplitType, undefined> =>
  // @ts-expect-error TS enums/string coersion *eyeroll*
  Object.fromEntries(Object.values(SplitType).map((type) => [type, undefined]));
