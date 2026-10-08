import { existsSync } from 'node:fs';

// Match the database launcher's .env contract. Node preserves shell overrides.
export const loadTestEnvironment = () => {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
};
