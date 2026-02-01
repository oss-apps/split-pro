import { readFileSync, readdirSync, statSync } from 'node:fs';
import { pipeline } from 'stream/promises';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { db } from '~/server/db';
import { env } from '~/env';

const migrationsPath = `${process.cwd()}/migrations`;

export async function runDbMigrations() {
  console.info(`Running DB migrations for "${env.NODE_ENV}"`);

  // check if any migrations have been applied
  const migrationsTable: ({ exists: boolean } | undefined)[] = await db.$queryRaw`
    SELECT EXISTS(
      SELECT * 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
    );
  `;

  const migrationTableExists = migrationsTable[0]?.exists === true;

  if (!migrationTableExists) {
    await db.$queryRaw`
      CREATE TABLE _prisma_migrations (
        id                      VARCHAR(36) PRIMARY KEY NOT NULL,
        checksum                VARCHAR(64) NOT NULL,
        finished_at             TIMESTAMPTZ,
        migration_name          VARCHAR(255) NOT NULL,
        logs                    TEXT,
        rolled_back_at          TIMESTAMPTZ,
        started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        applied_steps_count     INTEGER NOT NULL DEFAULT 0
      );
    `;
  }

  const dbMigrations: {
    id: string;
    checksum: string;
    finished_at: string;
    migration_name: string;
    logs: string | null;
    rolled_back_at: string | null;
    started_at: string;
    applied_steps_count: number;
  }[] = await db.$queryRaw`
    SELECT *
    FROM _prisma_migrations
  `;

  const localMigrations = walkMigrationDirectory();

  console.info(
    `DB migration found (${dbMigrations.length}): ${dbMigrations.map(({ migration_name }) => migration_name).join(', ')}`,
  );
  console.info(`Local migrations found (${localMigrations.length}): ${localMigrations.join(', ')}`);

  let totalMigrationsApplied = 0;
  for (const localMigrationName of localMigrations) {
    // find local migration in all DB migrations
    const existingMigration = dbMigrations.find(
      (migration) => migration.migration_name === localMigrationName,
    );
    if (existingMigration?.rolled_back_at) {
      throw new Error(
        'Unsupported Prisma migrate feature: Script does not support rolled back migrations',
      );
    }

    if (!existingMigration) {
      console.info(`Migration ${localMigrationName} will be executed`);

      const migrationContents = readFileSync(
        `${migrationsPath}/${localMigrationName}/migration.sql`,
        'utf8',
      );

      // executeRawUnsafe cannot insert multiple commands into a prepared statement
      const migrationStatements = migrationContents
        .split(';\n\n')
        .map((stmt) => stmt.trim() + ';')
        .filter((stmt) => stmt.length > 0);

      const ops = [
        ...migrationStatements.map((stmt) => db.$executeRawUnsafe(stmt)),
        db.$executeRawUnsafe(`
          INSERT INTO _prisma_migrations (
            id,
            checksum,
            migration_name,
            finished_at,
            started_at,
            applied_steps_count,
            logs,
            rolled_back_at
            ) VALUES (
            '${randomUUID()}',
            '${await computeHash(migrationContents)}',
            '${localMigrationName}',
            now(),
            now(),
            1,
            NULL,
            NULL
        );
        `),
      ];

      await db.$transaction(ops);

      console.info(`Migration ${localMigrationName} applied successfully`);

      totalMigrationsApplied++;
    }
  }
  console.info(`A total of ${totalMigrationsApplied} migration(s) were applied`);
}

function walkMigrationDirectory() {
  return readdirSync(migrationsPath).reduce<string[]>((migrations, file) => {
    const dirPath = join(migrationsPath, file);
    if (statSync(dirPath).isDirectory()) {
      migrations.push(file);
    }
    return migrations;
  }, []);
}

async function computeHash(content: string) {
  const hash = createHash('sha256');
  await pipeline(content, hash);
  return hash.digest('hex');
}
