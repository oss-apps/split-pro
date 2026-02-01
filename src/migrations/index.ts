/**
 * Migration Runner
 *
 * This module manages data migrations for SplitPro.
 * It checks the current schema version and runs necessary migrations.
 *
 * Version format: semver-like string (e.g., "2.0.0")
 * Versions are compared lexicographically, which works for semver.
 */

import { db } from '~/server/db';

// Import migrations
import { migrateSettlementsToGroups } from './settle_groups';

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
  } catch {
    // Table might not exist yet
    return null;
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

/**
 * Run all pending migrations.
 * Migrations are run in order and each updates the schema version on success.
 */
export async function runMigrations(): Promise<void> {
  console.log('=== SplitPro Data Migrations ===\n');

  const currentVersion = await getCurrentVersion();
  console.log(`Current schema version: ${currentVersion ?? '<none (pre-2.0.0)>'}`);

  switch (currentVersion) {
    case null:
      console.log('--- Migrating settlements to group-specific settlements ---\n');
      await migrateSettlementsToGroups();
      await setVersion('2.0.0');
  }

  console.log('=== All migrations completed ===\n');
}
