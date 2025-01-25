import { type Group, SplitType, type User } from '@prisma/client';
import Router from 'next/router';
import { create } from 'zustand';

export type Participant = User & { amount?: number; splitShare?: number };

interface AddExpenseState {
  amount: number;
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
    setAmount: (amount: number) => void;
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
  amount: 0,
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
          ...calculateParticipantSplit(state.amount, state.participants, splitType, state.paidBy),
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
          participants.push({ ...user, splitShare: state.splitType === SplitType.EQUAL ? 1 : 0 });
        }
        return {
          ...calculateParticipantSplit(state.amount, participants, state.splitType, state.paidBy),
        };
      }),
    setParticipants: (_participants) =>
      set((state) => {
        const participants = _participants.map((p) => ({
          splitShare: state.splitType === SplitType.EQUAL ? 1 : 0,
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
        amount: 0,
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
  amount: number,
  participants: Array<Participant>,
  splitType: SplitType,
  paidBy?: User,
) {
  let canSplitScreenClosed = true;
  if (amount === 0) return { participants, canSplitScreenClosed };

  let updatedParticipants = participants;

  switch (splitType) {
    case SplitType.EQUAL:
      const totalParticipants = participants.filter((p) => p.splitShare !== 0).length;
      updatedParticipants = participants.map((p) => ({
        ...p,
        amount: p.splitShare === 0 ? 0 : amount / totalParticipants,
      }));
      canSplitScreenClosed = !!updatedParticipants.find((p) => p.splitShare);
      break;
    case SplitType.PERCENTAGE:
      updatedParticipants = participants.map((p) => ({
        ...p,
        amount: ((p.splitShare ?? 0) / 100) * amount,
      }));

      canSplitScreenClosed =
        100 - participants.reduce((acc, p) => acc + (p.splitShare ?? 0), 0) === 0;
      break;
    case SplitType.SHARE:
      const totalShare = participants.reduce((acc, p) => acc + (p.splitShare ?? 0), 0);
      updatedParticipants = participants.map((p) => ({
        ...p,
        amount: ((p.splitShare ?? 0) * amount) / totalShare,
      }));
      break;
    case SplitType.EXACT:
      const totalSplitShare = participants.reduce((acc, p) => acc + (p.splitShare ?? 0), 0);

      const epsilon = 0.01;
      canSplitScreenClosed = Math.abs(amount - totalSplitShare) < epsilon;

      updatedParticipants = participants.map((p) => ({ ...p, amount: p.splitShare ?? 0 }));
      break;
    case SplitType.ADJUSTMENT:
      const totalAdjustment = participants.reduce((acc, p) => acc + (p.splitShare ?? 0), 0);
      if (totalAdjustment > amount) {
        canSplitScreenClosed = false;
      }
      const remainingAmountShare = (amount - totalAdjustment) / participants.length;
      updatedParticipants = participants.map((p) => ({
        ...p,
        amount: remainingAmountShare + (p.splitShare ?? 0),
      }));
      break;
  }

  updatedParticipants = updatedParticipants.map((p) => {
    if (p.id === paidBy?.id) {
      return { ...p, amount: -(p.amount ?? 0) + amount };
    }
    return { ...p, amount: -(p.amount ?? 0) };
  });

  return { participants: updatedParticipants, canSplitScreenClosed };
}

export function calculateSplitShareBasedOnAmount(
  amount: number,
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
        splitShare: (paidBy?.id === p.id ? (p.amount ?? 0) - amount : p.amount) === 0 ? 0 : 1,
      }));
      break;

    case SplitType.PERCENTAGE:
      // Convert amounts back to percentages
      updatedParticipants = participants.map((p) => ({
        ...p,
        splitShare:
          amount === 0
            ? 0
            : paidBy?.id !== p.id
              ? (Math.abs(p.amount ?? 0) / amount) * 100
              : (Math.abs(amount - (p.amount ?? 0)) / amount) * 100,
      }));
      break;

    case SplitType.SHARE:
      // Convert amounts back to shares
      const shares = participants.map((p) =>
        p.id === paidBy?.id
          ? Math.abs(amount - (p.amount ?? 0)) / amount
          : Math.abs(p.amount ?? 0) / amount,
      );

      // Find the minimum share value
      const minShare = Math.min(...shares);

      // Calculate multiplier to make minimum share equal to 1
      const multiplier = minShare !== 0 ? 1 / minShare : 1;

      updatedParticipants = participants.map((p) => ({
        ...p,
        splitShare:
          (amount === 0
            ? 0
            : paidBy?.id !== p.id
              ? Math.abs(p.amount ?? 0) / amount
              : Math.abs(amount - (p.amount ?? 0)) / amount) * multiplier,
      }));
      break;

    case SplitType.EXACT:
      // For exact, split share is the absolute amount
      updatedParticipants = participants.map((p) => ({
        ...p,
        splitShare:
          paidBy?.id !== p.id ? Math.abs(p.amount ?? 0) : Math.abs(amount - (p.amount ?? 0)),
      }));
      break;

    case SplitType.ADJUSTMENT:
      // For adjustment, split share is the difference from equal share
      updatedParticipants = participants.map((p) => ({
        ...p,
        splitShare:
          amount === 0
            ? 0
            : paidBy?.id !== p.id
              ? Math.abs(p.amount ?? 0)
              : Math.abs(amount - (p.amount ?? 0)),
      }));
      break;
  }

  return updatedParticipants;
}
