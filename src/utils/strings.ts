import { type User } from '@prisma/client';
import { format, isToday } from 'date-fns';

export const displayName = (
  user: Pick<User, 'name' | 'email' | 'id'>,
  currentUserId?: number,
): string => (currentUserId === user.id ? 'You' : (user.name ?? user.email!));

export const toUIDate = (date: Date, { useToday = false, year = false } = {}): string =>
  useToday && isToday(date) ? 'Today' : format(date, year ? 'dd MMM yyyy' : 'MMM dd');
