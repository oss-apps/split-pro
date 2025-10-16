import { faker } from '@faker-js/faker';
import {
  generateAllExpenses,
  generateExpenseEdits,
  generateExpensesToDelete,
} from './expenseGenerator';
import { generateUsers } from './userGenerator';
import { generateGroups } from './groupGenerator';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { argv } from 'node:process';
import { formatSeedStatisticsMarkdown, generateSeedStatistics } from './stats';
import '~/utils/bigintPolyfill';

const SEED = 2137;

faker.seed(SEED);
faker.setDefaultRefDate('2025-01-01T00:00:00.000Z');

const dummyUsers = generateUsers();
const dummyGroups = generateGroups(dummyUsers);
const dummyExpenses = generateAllExpenses(dummyUsers, dummyGroups);
const dummyExpenseEdits = generateExpenseEdits(dummyExpenses);
const dummyExpensesToDelete = generateExpensesToDelete(dummyExpenses);

export const dummyData = {
  users: dummyUsers,
  groups: dummyGroups,
  expenses: dummyExpenses,
  expenseEdits: dummyExpenseEdits,
  expensesToDelete: dummyExpensesToDelete,
  seed: SEED,
};

// Create a checksum of all generated data to verify determinism
const dataToHash = JSON.stringify(dummyData);

const hash = createHash('sha256').update(dataToHash).digest('hex');

const savedHash = await readFile('./prisma/seed-checksum.txt', 'utf-8').catch(() => null);

if (savedHash && savedHash !== hash) {
  const msg = `Generated data checksum does not match saved checksum! This may indicate non-deterministic data generation.
If you intended to change the dummy data, update the checksum in prisma/seed-checksum.txt to the new value:
  echo "${hash}" > prisma/seed-checksum.txt
If you did not intend to change the dummy data, please investigate the cause of the discrepancy.`;

  if (argv.includes('--strict')) {
    throw new Error(msg);
  }
  console.warn('***********************************************');
  console.warn('WARNING: Data checksum mismatch!');
  console.warn('***********************************************');
  console.warn(msg);
}

// Generate and save seed statistics as markdown
const stats = generateSeedStatistics(dummyUsers, dummyGroups, dummyExpenses);
const statsMarkdown = formatSeedStatisticsMarkdown(stats);
await writeFile('./SEED_STATISTICS.md', statsMarkdown).catch((err) => {
  console.warn('Failed to write seed statistics:', err instanceof Error ? err.message : err);
});
