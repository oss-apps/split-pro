import { type User } from '@prisma/client';
import { format, isToday } from 'date-fns';
import { type TFunction } from 'next-i18next';

export const displayName = (
  user: Pick<User, 'name' | 'email' | 'id'>,
  currentUserId?: number,
  t?: TFunction,
): string => {
  if (currentUserId === user.id) {
    return t ? t('ui.you', { ns: 'common' }) : 'You';
  }
  return user.name ?? user.email!;
};

export const toUIDate = (date: Date, { useToday = false, year = false } = {}): string =>
  useToday && isToday(date) ? 'Today' : format(date, year ? 'dd MMM yyyy' : 'MMM dd');
