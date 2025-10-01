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

async function getDbCachedData<T, K extends CachedBankDataKey>({
  key,
  where,
  maxAgeMs = 24 * 60 * 60 * 1000,
}: GetDbCachedDataParams<K>): Promise<T | null> {
  const minLastFetched = new Date(Date.now() - maxAgeMs);

  const cached = await db[key].findUnique({
    where: {
      ...where,
      lastFetched: {
        gt: minLastFetched,
      },
    } as DbCachedData[K]['where'],
  });

  return cached as T | null;
}

async function setDbCachedData<K extends CachedBankDataKey>({
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

export { getDbCachedData, setDbCachedData };
