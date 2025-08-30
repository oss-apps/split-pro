CREATE EXTENSION IF NOT EXISTS pg_cron;

-- I have tested to run this multiple times and it doesn't create duplicate jobs.
-- Which means that we can add multiple crons here and run the pnpm db:cron command multiple times and it will work.

SELECT cron.schedule(
  'cleanup_cached_bank_data_daily',
  '0 2 * * *',
  $$
  DELETE FROM "CachedBankData"
  WHERE "lastFetched" < NOW() - INTERVAL '2 days'
  $$
);

SELECT cron.schedule(
  'cleanup_cached_bank_data_minute',
  '* * * * *',
  $$
  DELETE FROM "CachedBankData"
  WHERE "lastFetched" < NOW() - INTERVAL '2 days'
  $$
);