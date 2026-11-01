# Recurring transactions

SplitPro uses PostgreSQL's `pg_cron` extension to generate recurring expenses.
Users select calendar days; the instance operator configures one execution time
and time zone for all expense recurrences.

## Requirements

- PostgreSQL with `pg_cron` enabled.
- Use the provided `ossapps/postgres` image or a compatible PostgreSQL installation.
- The [production Compose file](../docker/prod/compose.yml) enables the extension
  and configures its time zone. For an external database, see
  [PostgreSQL prerequisites](CONFIGURATION.md#external-postgresql-prerequisites-pg_cron).

## Creating and managing recurrences

Choose daily, weekly, monthly or yearly repetition in the recurrence editor.
Select weekdays, days of the month or a month as appropriate. There is no time
picker: all rules use the instance execution time. Recurrence management is
available from the Activity tab.

A recurring expense starts with a template expense. Editing the template changes
future occurrences and leaves existing derived expenses unchanged. Deleting the
template stops the rule and preserves generated expenses. Editing or deleting a
derived expense does not change the template's schedule.

The initial expense already covers its date. A scheduled run on or before that
date creates nothing. Subsequent runs can generate at most one expense per
recurrence per instance-calendar day, including after retries or deletion of a
generated expense. Existing expense timestamps are interpreted in the instance
time zone for this check.

## Execution time and calendar

| Setting                | Default | Purpose                                                                                |
| ---------------------- | ------- | -------------------------------------------------------------------------------------- |
| `RECURRENCE_TIME`      | `00:00` | App setting: execution time in 24-hour `HH:mm` format, from `00:00` through `23:59`.   |
| `RECURRENCE_TIME_ZONE` | `UTC`   | Compose setting: configures PostgreSQL's `cron.timezone`, for example `Europe/Warsaw`. |

`cron.timezone` is the source of truth for weekdays, month boundaries and execution
time. Browser and application-server OS time zones do not change saved calendar
fields. For example, a monthly last-day rule remains a last-day rule in the instance
calendar regardless of who creates or edits it.

All recurrence rules on an instance share these settings. `RECURRENCE_TIME` is a
runtime app setting; no rebuild is required. Invalid time values fail app environment
validation. For external/managed PostgreSQL, set `cron.timezone` on the database
server: setting `RECURRENCE_TIME_ZONE` on the application alone does not configure
an external database. The app reads the actual database setting for previews.

The configured time is when a job is scheduled to run. Actual execution can be
delayed by database load or availability. Missed days during database downtime are
not automatically backfilled.

## What users see in their browser

The editor, recurring-expenses list and expense details show the **next scheduled
run as a full local date and time in the browser's time zone**, with that zone's
name. Underneath, they show the configured schedule and its instance time zone.
The browser preview refreshes every minute.

For example, with `RECURRENCE_TIME=02:35` and `RECURRENCE_TIME_ZONE=UTC`, a monthly
rule for January 1 runs at January 1, 2027, 02:35 UTC. A browser in
`America/Los_Angeles` shows December 31, 2026, 18:35. The saved rule still means
January 1 in UTC.

The preview converts a concrete upcoming occurrence, using the daylight-saving
offsets for that date. A fixed instance time may therefore appear at different
local times in summer and winter. It does not promise the same browser-local day
to users around the world. Changing the browser zone changes the display, not the
saved rule. The preview describes a scheduled job run; the initial-expense and
already-generated-date checks can still make that run a no-op.

## Production Docker Compose configuration

In the directory containing the production `compose.yml`, add these values to
`.env`:

```dotenv
RECURRENCE_TIME="06:35"
RECURRENCE_TIME_ZONE="Europe/Warsaw"
```

The PostgreSQL service receives the zone through `-c cron.timezone=...`; the app
receives `RECURRENCE_TIME` through its environment. Both have defaults, so existing
`.env` files continue to use midnight UTC.

After changing only the execution time, recreate the app container:

```bash
docker compose up -d --force-recreate splitpro
```

After changing the time zone, recreate PostgreSQL and the app so the database uses
the new zone and the app reconciles schedules against it:

```bash
docker compose up -d --force-recreate postgres splitpro
```

These commands assume the production Compose file and `.env` are in the current
directory. A plain `docker compose restart` does not apply changed environment
variables or container command arguments. Recreating the containers keeps their
named data volumes; do not remove those volumes when changing recurrence settings.

On every normal Node.js server startup, the instrumentation hook runs data
migrations, then checks existing expense jobs against `RECURRENCE_TIME`. It changes
only schedules that differ, preserving calendar fields, job IDs, commands and
active status. New and edited recurrences use the same setting. Reconciliation is
skipped in `TEST_MODE`; unchanged schedules are left alone on repeated startups.
Deploy the same execution time to every application replica sharing the database.

`cron.timezone` applies to **all pg_cron jobs**, including cache cleanup. Changing
`RECURRENCE_TIME` only updates expense jobs; changing the zone also changes the
wall-clock interpretation of `CLEAR_CACHE_CRON_RULE`. Review maintenance schedules
when changing the zone. Existing historical expense dates are not rewritten.

## Calendar rules and examples

With `RECURRENCE_TIME=06:35`, the resulting database schedules are:

| Selection               | pg_cron schedule in the instance time zone |
| ----------------------- | ------------------------------------------ |
| Daily                   | `35 6 * * *`                               |
| Every Sunday            | `35 6 * * 0`                               |
| First day of each month | `35 6 1 * *`                               |
| Last day of each month  | `35 6 $ * *`                               |
| January 1 each year     | `35 6 1 1 *`                               |

The UI uses `L` for last day; PostgreSQL uses `$`. This marker conversion does not
shift dates or months. Last day follows the actual month length, including leap
years. A rule for the 31st skips months without a 31st, and February 29 skips
non-leap years. Legacy custom rules retain cron semantics: restricting both the
day of month and weekday matches either field.

`pg_cron` supports standard five-field cron expressions, including ranges, lists
and steps, plus its `$` last-day marker. The recurrence editor offers calendar
choices rather than arbitrary execution times. See the
[pg_cron documentation](https://github.com/citusdata/pg_cron#cron-syntax) for syntax.
Choose an execution time away from local daylight-saving clock transitions if you
want to avoid skipped or repeated wall-clock times in that zone.

## Upgrading existing recurrences

The date-only migration removes saved hour/minute choices while retaining stored
calendar fields. Startup reconciliation then applies `RECURRENCE_TIME`. It also
records existing occurrence dates to prevent duplicate generation during the
upgrade. Existing expenses and participants are preserved.

The old browser-offset conversion did not store the original zone or calendar
intent. Rules already shifted incorrectly cannot be repaired automatically. After
upgrading, review existing rules, especially the first/last day of a month and
rules near year boundaries. Correct those schedules in the editor; historical
expenses are not automatically moved or deleted.

For implementation details and remaining timestamp limitations, see the
[date-only recurrence design](date-only-recurrence.md).

## Checking pg_cron

Run these queries in the SplitPro database:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
SHOW cron.timezone;

SELECT j.jobid, j.schedule, j.active
FROM cron.job j
JOIN "ExpenseRecurrence" r ON r."jobId" = j.jobid;
```

The startup log reports how many recurrence schedules were updated and the target
execution time. For other environment settings, see [Configuration](CONFIGURATION.md).

## UI walkthrough videos

These videos demonstrate the general workflow; older recordings may show the removed time picker.

- Creating a recurrence: https://github.com/user-attachments/assets/39799e04-030d-42da-8feb-7805f17ecb5e
- Managing recurrences: https://github.com/user-attachments/assets/da291cdf-7db6-4fb5-8a33-806216dfca21
