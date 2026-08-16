import { closeDatabase } from '~/tests/integration/database';

jest.setTimeout(30_000);

afterAll(async () => {
  await closeDatabase();
});
