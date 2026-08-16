import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test as setup } from '@playwright/test';
import { db } from '~/server/db';

const authDir = join(process.cwd(), 'playwright', '.auth');
const email = `playwright-${Date.now()}-${randomBytes(4).toString('hex')}@example.test`;

setup('create database-backed session', async () => {
  const user = await db.user.create({
    data: { email, name: 'Playwright Owner', preferredLanguage: 'en' },
  });
  const sessionToken = randomBytes(32).toString('hex');
  await db.session.create({
    data: { sessionToken, userId: user.id, expires: new Date(Date.now() + 86_400_000) },
  });
  await mkdir(authDir, { recursive: true });
  await writeFile(join(authDir, 'user-meta.json'), JSON.stringify({ userId: user.id, email }));
  await writeFile(
    join(authDir, 'user.json'),
    JSON.stringify({
      cookies: [
        {
          name: 'next-auth.session-token',
          value: sessionToken,
          domain: '127.0.0.1',
          path: '/',
          httpOnly: true,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    }),
  );
});
