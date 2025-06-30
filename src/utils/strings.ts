import { type User } from '@prisma/client';
import { format, isToday } from 'date-fns';

export const displayName = (
  user: Pick<User, 'name' | 'email' | 'id'>,
  currentUserId?: number,
  t?: (key: string) => string,
): string => {
  if (currentUserId === user.id) {
    return t ? t('ui.you') : 'You';
  }
  return user.name ?? user.email!;
};

export const toUIDate = (date: Date, { useToday = false, year = false } = {}): string =>
  useToday && isToday(date) ? 'Today' : format(date, year ? 'dd MMM yyyy' : 'MMM dd');
