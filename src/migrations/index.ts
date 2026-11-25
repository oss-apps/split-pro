/**
 * Migration Runner
 *
 * This module manages data migrations for SplitPro.
 * It checks the current schema version and runs necessary migrations.
 *
 * Version format: semver-like string (e.g., "2.0.0")
 * Versions are compared lexicographically, which works for semver.
 */

import { Prisma } from '@prisma/client';

import { env } from '~/env';
import { db } from '~/server/db';

// Import migrations
import { convertExistingFilesToWebP } from './convert-files-to-webp';
import { runDbMigrations } from './programmatic-prisma';

/**
 * Get the current schema version from the database.
 * Returns null if no version is set (pre-2.0.0 database).
 */
async function getCurrentVersion(): Promise<string | null> {
  try {
    const record = await db.appMetadata.findUnique({
      where: { key: 'schema_version' },
    });
    return record?.value ?? null;
  } catch (error) {
    // A missing metadata table identifies databases created before version tracking was added.
    // Connection and permission failures must escape so startup does not mistake them for old data.
    if (error instanceof Prisma.PrismaClientKnownRequestError && 'P2021' === error.code) {
      return null;
    }

    throw error;
  }
}

/**
 * Set the schema version in the database.
 */
async function setVersion(version: string): Promise<void> {
  await db.appMetadata.upsert({
    where: { key: 'schema_version' },
    update: { value: version },
    create: { key: 'schema_version', value: version },
  });
}

export const checkDatabaseConnection = async (): Promise<void> => {
  // Keep this probe free of writes so every retry is safe.
  await db.$queryRaw`SELECT 1`;
};

/**
 * Run all pending migrations.
 * Migrations are run in order and each updates the schema version on success.
 */
export async function runMigrations(): Promise<void> {
  if (env.DOCKER_OUTPUT) {
    console.log('=== Prisma DB Migrations ===\n');
    await runDbMigrations();
  }

  console.log('=== SplitPro Data Migrations ===\n');

  const currentVersion = await getCurrentVersion();
  console.log(`Current schema version: ${currentVersion ?? '<none (pre-2.0.0)>'}`);

  switch (currentVersion) {
    case null:
      await convertExistingFilesToWebP();
      await setVersion('2.0.0');
  }

  console.log('=== All migrations completed ===\n');
}
