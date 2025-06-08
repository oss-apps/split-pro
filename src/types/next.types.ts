import { type NextPage } from 'next';
import { type User } from 'next-auth';

// eslint-disable-next-line @typescript-eslint/ban-types
export type NextPageWithUser<T = {}> = NextPage<{ user: User } & T> & { auth: boolean };

export type PushMessage = { title: string; message: string };
