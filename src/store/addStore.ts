import { type Group, SplitType, type User } from '@prisma/client';
import Router from 'next/router';
import { create } from 'zustand';

import { BigMath } from '~/utils/numbers';

export type Participant = User & { amount?: bigint; splitShare?: bigint };

interface AddExpenseState {
  amount: bigint;
  amountStr: string;
  currentUser: User | undefined;
  splitType: SplitType;
  group: Group | undefined;
  participants: Array<Participant>;
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
    setParticipants: (participants: Array<Participant>) => void;
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
  group: undefined,
  participants: [],
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
          s.paidBy,
        );

        return { amount, participants, canSplitScreenClosed };
      }),
    setAmountStr: (amountStr) => set({ amountStr }),
    setSplitType: (splitType) =>
      set((state) => {
        return {
          splitType,
          ...calculateSplitShareBasedOnAmount(
            state.amount,
            state.participants,
            splitType,
            state.paidBy,
          ),
        };
      }),
    setGroup: (group) => {
      set({ group });
    },
    addOrUpdateParticipant: (user) =>
      set((state) => {
        const participants = [...state.participants];
        const userIndex = participants.findIndex((p) => p.id === user.id);
        if (userIndex !== -1) {
          participants[userIndex] = user;
        } else {
          participants.push({ ...user, splitShare: state.splitType === SplitType.EQUAL ? 1n : 0n });
        }
        return {
          ...calculateParticipantSplit(state.amount, participants, state.splitType, state.paidBy),
        };
      }),
    setParticipants: (_participants) =>
      set((state) => {
        const participants = _participants.map((p) => ({
          splitShare: state.splitType === SplitType.EQUAL ? 1n : 0n,
          ...p,
        }));
        return {
          splitType: SplitType.EQUAL,
          ...calculateParticipantSplit(state.amount, participants, SplitType.EQUAL, state.paidBy),
        };
      }),
    removeLastParticipant: () => {
      set((state) => {
        const currentPath = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.delete('friendId');

        Router.push(`${currentPath}?${searchParams.toString()}`).catch(console.error);

        if (state.participants.length === 1) return {};
        const newParticipants = [...state.participants];
        newParticipants.pop();
        return {
          ...calculateParticipantSplit(
            state.amount,
            newParticipants,
            state.splitType,
            state.paidBy,
          ),
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
        return {
          ...calculateParticipantSplit(
            state.amount,
            newParticipants,
            state.splitType,
            state.paidBy,
          ),
        };
      });
    },
    setCurrency: (currency) => set({ currency }),
    setCategory: (category) => set({ category }),
    setNameOrEmail: (nameOrEmail) => set({ nameOrEmail, showFriends: nameOrEmail.length > 0 }),
    setPaidBy: (paidBy) =>
      set((s) => ({
        paidBy,
        ...calculateParticipantSplit(s.amount, s.participants, s.splitType, paidBy),
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
      }));
    },
    setSplitScreenOpen: (splitScreenOpen) => set({ splitScreenOpen }),
    setExpenseDate: (expenseDate) => set({ expenseDate }),
  },
}));

export function calculateParticipantSplit(
  amount: bigint,
  participants: Array<Participant>,
  splitType: SplitType,
  paidBy?: User,
) {
  let canSplitScreenClosed = true;
  if (amount === 0n) return { participants, canSplitScreenClosed };

  let updatedParticipants = participants;

  switch (splitType) {
    case SplitType.EQUAL:
      const totalParticipants = participants.filter((p) => p.splitShare !== 0n).length;
      updatedParticipants = participants.map((p) => ({
        ...p,
        amount: p.splitShare === 0n ? 0n : amount / BigInt(totalParticipants),
      }));
      canSplitScreenClosed = !!updatedParticipants.find((p) => p.splitShare);
      break;
    case SplitType.PERCENTAGE:
      updatedParticipants = participants.map((p) => ({
        ...p,
        amount: (BigInt(p.splitShare ?? 0) * amount) / 100n,
      }));

      canSplitScreenClosed =
        100 - participants.reduce((acc, p) => acc + (Number(p.splitShare) ?? 0), 0) === 0;
      break;
    case SplitType.SHARE:
      const totalShare = participants.reduce((acc, p) => acc + (Number(p.splitShare) ?? 0), 0);
      updatedParticipants = participants.map((p) => ({
        ...p,
        amount: (BigInt(p.splitShare ?? 0) * amount) / BigInt(totalShare),
      }));
      break;
    case SplitType.EXACT:
      const totalSplitShare = participants.reduce((acc, p) => acc + (p.splitShare ?? 0n), 0n);

      // ? Look into this logic
      const epsilon = 1n;
      canSplitScreenClosed = BigMath.abs(amount - BigInt(totalSplitShare)) < epsilon;

      updatedParticipants = participants.map((p) => ({ ...p, amount: BigInt(p.splitShare ?? 0) }));
      break;
    case SplitType.ADJUSTMENT:
      const totalAdjustment = participants.reduce((acc, p) => acc + (p.splitShare ?? 0n), 0n);
      if (totalAdjustment > amount) {
        canSplitScreenClosed = false;
      }
      const remainingAmountShare = (amount - totalAdjustment) / BigInt(participants.length);
      updatedParticipants = participants.map((p) => ({
        ...p,
        amount: BigInt(remainingAmountShare + (p.splitShare ?? 0n)),
      }));
      break;
  }

  // ! Implement penny splitting logic

  updatedParticipants = updatedParticipants.map((p) => {
    if (p.id === paidBy?.id) {
      return { ...p, amount: -(p.amount ?? 0n) + amount };
    }
    return { ...p, amount: -(p.amount ?? 0n) };
  });

  return { participants: updatedParticipants, canSplitScreenClosed };
}

export function calculateSplitShareBasedOnAmount(
  amount: bigint,
  participants: Array<Participant>,
  splitType: SplitType,
  paidBy?: User,
) {
  let updatedParticipants = [...participants];

  console.log('calculateSplitShareBasedOnAmount', amount, participants, splitType);

  switch (splitType) {
    case SplitType.EQUAL:
      // For equal split, split share should be amount/participants or 0 if amount is 0
      updatedParticipants = participants.map((p) => ({
        ...p,
        splitShare: (paidBy?.id === p.id ? (p.amount ?? 0n) - amount : p.amount) === 0n ? 0n : 1n,
      }));
      break;

    case SplitType.PERCENTAGE:
      // Convert amounts back to percentages
      updatedParticipants = participants.map((p) => ({
        ...p,
        splitShare:
          amount === 0n
            ? 0n
            : paidBy?.id !== p.id
              ? (BigMath.abs(p.amount ?? 0n) / amount) * 10000n
              : (BigMath.abs(amount - (p.amount ?? 0n)) / amount) * 10000n,
      }));
      break;

    case SplitType.SHARE:
      // Convert amounts back to shares
      const shares = participants.map((p) =>
        p.id === paidBy?.id
          ? BigMath.abs(amount - (p.amount ?? 0n)) / amount
          : BigMath.abs(p.amount ?? 0n) / amount,
      );

      // Find the minimum share value
      const minShare = BigMath.min(...shares);

      // Calculate multiplier to make minimum share equal to 1
      const multiplier = minShare !== 0n ? 1n / minShare : 1n;

      updatedParticipants = participants.map((p) => ({
        ...p,
        splitShare:
          (amount === 0n
            ? 0n
            : paidBy?.id !== p.id
              ? BigMath.abs((p.amount ?? 0n) / amount)
              : BigMath.abs(amount - (p.amount ?? 0n) / amount)) * multiplier,
      }));
      break;

    case SplitType.EXACT:
      // For exact, split share is the absolute amount
      updatedParticipants = participants.map((p) => ({
        ...p,
        splitShare:
          paidBy?.id !== p.id
            ? BigMath.abs(p.amount ?? 0n)
            : BigMath.abs(amount - (p.amount ?? 0n)),
      }));
      break;

    case SplitType.ADJUSTMENT:
      // For adjustment, split share is the difference from equal share
      updatedParticipants = participants.map((p) => ({
        ...p,
        splitShare:
          amount === 0n
            ? 0n
            : paidBy?.id !== p.id
              ? BigMath.abs(p.amount ?? 0n)
              : BigMath.abs(amount - (p.amount ?? 0n)),
      }));
      break;
  }

  return { participants: updatedParticipants };
}
