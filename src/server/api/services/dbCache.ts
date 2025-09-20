import { db } from '~/server/db';
import type { Prisma } from '@prisma/client';

type CachedBankDataKey = 'cachedBankData';

interface DbCachedData {
  cachedBankData: {
    where: Prisma.CachedBankDataWhereUniqueInput;
    data: Prisma.CachedBankDataCreateInput;
  };
}

interface GetDbCachedDataParams<K extends CachedBankDataKey> {
  key: K;
  where: DbCachedData[K]['where'];
  maxAgeMs?: number;
}

interface SetDbCachedDataParams<K extends CachedBankDataKey> {
  key: K;
  where: DbCachedData[K]['where'];
  data: DbCachedData[K]['data'];
}

export async function getDbCachedData<T, K extends CachedBankDataKey>({
  key,
  where,
  maxAgeMs = 24 * 60 * 60 * 1000,
}: GetDbCachedDataParams<K>): Promise<T | null> {
  const cached = await db[key].findUnique({
    where: where,
  });

  if (!cached) {
    return null;
  }

  const isFresh = cached.lastFetched > new Date(Date.now() - maxAgeMs);
  if (!isFresh) {
    return null;
  }

  return cached as T;
}

export async function setDbCachedData<K extends CachedBankDataKey>({
  key,
  where,
  data,
}: SetDbCachedDataParams<K>): Promise<void> {
  await db[key].upsert({
    where,
    update: data,
    create: data,
  });
}
