import { type User } from '@prisma/client';

export const displayName = (user: User, currentUserId?: number): string =>
  currentUserId === user.id ? 'You' : (user.name ?? user.email!);
