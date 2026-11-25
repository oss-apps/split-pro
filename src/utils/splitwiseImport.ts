import {
  type SplitwiseGroup,
  SplitwiseGroupSchema,
  type SplitwiseUser,
  SplitwiseUserSchema,
} from '~/types';

export interface SplitwiseImportPreview {
  usersWithBalance: SplitwiseUser[];
  groups: SplitwiseGroup[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  'object' === typeof value && null !== value && !Array.isArray(value);

export const parseSplitwiseImport = (input: unknown): SplitwiseImportPreview => {
  if (!isRecord(input) || !Array.isArray(input.friends) || !Array.isArray(input.groups)) {
    throw new Error('Invalid Splitwise export');
  }

  const usersWithBalance = input.friends.flatMap((friend): SplitwiseUser[] => {
    if (!isRecord(friend)) {
      throw new Error('Invalid friend record');
    }

    if ('confirmed' !== friend.registration_status) {
      return [];
    }

    if (!Array.isArray(friend.balance)) {
      throw new Error('Invalid friend balance');
    }

    if (0 === friend.balance.length) {
      return [];
    }

    return [SplitwiseUserSchema.parse(friend)];
  });

  const groups = input.groups.flatMap((group): SplitwiseGroup[] => {
    if (!isRecord(group) || 'number' !== typeof group.id || !Array.isArray(group.members)) {
      throw new Error('Invalid group record');
    }

    if (0 === group.id || 0 === group.members.length) {
      return [];
    }

    return [SplitwiseGroupSchema.parse(group)];
  });

  return { usersWithBalance, groups };
};
