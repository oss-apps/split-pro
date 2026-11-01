# Date-only recurrence proposal and implementation

## Calendar contract

The database's `cron.timezone` is the single instance calendar. Default UTC;
operators may set `RECURRENCE_TIME_ZONE=Europe/Warsaw` in the Docker Compose
environment. Restart PostgreSQL after changing it. Browser and application OS time
zones do not shift recurrence calendar fields. The editor, recurring list and expense details show the next scheduled run as a
full date and time in the browser's IANA zone, with the configured instance schedule
underneath. The preview resolves the next occurrence in cron.timezone on the server,
then formats that concrete instant in the browser after hydration. It refreshes every
minute; calendar fields are never shifted. This correctly displays previous/next-day
and year-boundary changes, and uses the DST offset at the occurrence date instead of
today's offset. A local wall-clock time may therefore vary across seasons.
All expense jobs run at `RECURRENCE_TIME` (`HH:mm`, default `00:00`) in that zone.
The Node instrumentation hook reconciles existing expense jobs on every app startup,
after data migrations and before notification polling. Only jobs whose time differs
are altered; calendar fields, job IDs, commands and active status are preserved.
New and edited rules use the same setting. Invalid times fail environment validation.
Maintenance jobs are excluded from reconciliation. Restart every application replica
with the same setting when changing it; mixed configurations can overwrite each other. This is an implementation detail,
not a promise of exact execution time. Maintenance jobs also follow cron.timezone;
review their schedules when changing it.

A shared zone is simple and suitable for a household or regional deployment, but
cannot promise the same browser-local date to users around the world. Removing
hours does not remove that tradeoff. The UI must promise the instance calendar.
For a global service, a group-level IANA zone and a periodic date dispatcher would
be a better follow-up than browser-offset translation.

## Issues

- #762: preserve day/month/week fields exactly. Only translate `L` to pg_cron's `$`.
  Last day remains last day through February, leap years and year boundaries.
- #698: the initial expense covers its date. The SQL function skips dates on or
  before it; a locked recurrence row records the last generated date, preventing
  concurrent or repeated calls from duplicating a day, even after deletion.

## Migration

`20261101130000_date_only_recurrence` normalizes existing expense job time fields
and adds a nullable last-occurrence date. It leaves maintenance schedules alone.
It preserves expense timestamps and all monetary/participant history. Deploy the
migration and app together, with scheduling paused during rollout. Back up first.

Existing rules are lossy: creator zones and original calendar intent were never
stored. A saved first-day rule could mean first day or a corrupted last-day rule.
No migration can distinguish them. Review existing rules after upgrade, particularly
first/last day and year-boundary schedules. Do not automatically rewrite historical
expense dates or delete apparent duplicates. Existing same-day derived expenses
should seed lastOccurrenceDate before resuming scheduling to avoid a rollout-day
repeat; this is done by the migration.

## Boundaries and remaining scope

Ordinary expense dates still use the existing timestamp API. The initial date guard
interprets those timestamps in the instance zone, which can differ from the date a
browser selected. A full application-wide removal of time needs a separate SQL DATE
migration and `YYYY-MM-DD` API contract for expenseDate, display helpers, imports,
filters, exports and calendar inputs. Audit historical dates before that conversion;
the original browser date cannot always be recovered. Audit timestamps (createdAt,
updatedAt, deletedAt) should remain instants.

Calendar rules retain cron semantics: the 31st skips shorter months, February 29
skips non-leap years, and restricted weekday plus day-of-month uses cron OR semantics.
Downtime does not backfill missed days. Some zones have historical midnight clock
transitions; pg_cron clock-jump behavior must be tested for any supported zone.
If guaranteed catch-up and unusual-zone support are requirements, use an hourly
reconciliation dispatcher with persisted occurrence dates rather than midnight jobs.

## Validation

Unit regressions cover browser offsets, last-day markers, month/year boundaries,
removal of time fields, configured execution times, startup reconciliation, and
browser-local previews across DST and calendar boundaries. Database regressions should cover a future template,
same-day skip, next-day execution, concurrent calls, deletion/retry, and a non-UTC
cron zone. Validate migrations against a disposable database before deployment.

Reference: https://github.com/citusdata/pg_cron documents cron.timezone, `$` and the
global scheduling configuration.
