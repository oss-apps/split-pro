jest.mock('~/server/db', () => ({ db: require('~/tests/integration/database').db }));
jest.mock('~/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('~/server/api/services/notificationService', () => ({
  sendExpensePushNotification: jest.fn().mockResolvedValue(undefined),
  sendGroupSimplifyDebtsToggleNotification: jest.fn().mockResolvedValue(undefined),
}));

import { acquireDatabaseLock, db, resetDatabase } from '~/tests/integration/database';

jest.setTimeout(30_000);
beforeAll(acquireDatabaseLock);
beforeEach(resetDatabase);
afterAll(() => db.$disconnect());
