# RECURRING TRANSACTIONS

SplitPro supports recurring expenses using PostgreSQL cron jobs. This requires the `pg_cron` extension.

## Requirements

- PostgreSQL with `pg_cron` enabled.
- Use the provided Docker image (`ossapps/postgres`) or a compatible Postgres build with the extension installed.
- See [docker/prod/compose.yml](../docker/prod/compose.yml) for a working configuration example.

## How it works

- A recurring expense is created from a template expense.
- The schedule uses a cron rule and generates derived expenses.
- Editing the template updates future occurrences only.
- Deleting the template removes the recurrence rule but preserves generated expenses.
- Recurrence management is available from the Activity tab.

## Editing behavior

- Template edits update the schedule and future instances.
- Existing derived expenses are not modified when you edit the template.
- Deleting the template removes the recurrence rule while keeping derived expenses.

## Cron limitations

`pg_cron` supports a subset of standard cron syntax. Ranges and lists are not supported.
Refer to https://github.com/citusdata/pg_cron#what-is-pg_cron for details.

## Example schedules

- Daily at 02:00 UTC: `0 2 * * *`
- Weekly on Sunday at 02:00 UTC: `0 2 * * 0`
- Monthly on the 1st at 02:00 UTC: `0 2 1 * *`

## Checking pg_cron

You can verify the extension inside Postgres:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

## Configuration

Recurring transactions rely on `pg_cron` and also use cache cleanup jobs configured via `CLEAR_CACHE_CRON_RULE` and `CACHE_RETENTION_INTERVAL`. See [CONFIGURATION](CONFIGURATION.md).

## UI walkthrough videos

- Creating a recurrence: https://github.com/user-attachments/assets/39799e04-030d-42da-8feb-7805f17ecb5e
- Managing recurrences: https://github.com/user-attachments/assets/da291cdf-7db6-4fb5-8a33-806216dfca21
