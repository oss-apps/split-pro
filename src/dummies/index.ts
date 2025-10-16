import { faker } from '@faker-js/faker';
import { generateAllExpenses } from './expenseGenerator';
import { generateUsers } from './userGenerator';
import { generateGroups } from './groupGenerator';

const SEED = 2137;

faker.seed(SEED);
faker.setDefaultRefDate('2025-01-01T00:00:00.000Z');

export const dummyUsers = generateUsers();
export const dummyGroups = generateGroups(dummyUsers);
export const dummyExpenses = generateAllExpenses(dummyUsers, dummyGroups);
