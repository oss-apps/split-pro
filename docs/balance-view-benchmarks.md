# Date-filterable balance views: benchmark findings

## Recommendation

Use a **plain, directed contribution view with `UNION ALL`**, filter it by
`expenseDate`, then aggregate with Prisma `groupBy`. Put this behind a balance
query service that returns the existing balance objects. Add a participant-by-user
index; a partial expense-date index also helps narrow date ranges.

This is the simplest measured design that supports arbitrary date bounds, keeps
Prisma-generated query types, and improves the application's selective user,
friend and group queries. It requires internal query changes, particularly where
routers currently use relation `include`; endpoint response shapes can stay the
same. Retain the aggregate-first `BalanceView` for genuinely unscoped, all-history
queries. A globally fixed "today" cutoff cannot represent each viewer's timezone.

The runnable prototypes are in `scripts/balance-benchmark/views.sql`. This report
archives the original experiment for [issue #604](https://github.com/oss-apps/split-pro/issues/604).
The follow-up implementation and seeded regression checks are on
`fix/604-date-aware-balances`.

## Reproduce

Requires the seeded local development database, installed dependencies, Node 22,
and `psql` on `PATH`. The runner loads `.env` without importing the seed generator
or application startup code.

```bash
# Existing indexes, all seven query shapes: two warmups and nine measured trials.
pnpm bench:balances --output /tmp/balances-baseline.json

# Same comparisons with the two proposed indexes.
pnpm bench:balances --participant-index --date-index --output /tmp/balances-indexed.json

# Isolate either index's effect.
pnpm bench:balances --participant-index --repetitions 5
pnpm bench:balances --date-index --repetitions 5

# Increase expense/participant volume tenfold, retaining the same users/groups.
pnpm bench:balances --scale 10 --participant-index --date-index \
  --variants original,canonical-reduce-first,union-entries,intervals \
  --repetitions 5 --warmups 2 --output /tmp/balances-scaled.json
```

Every run creates session-local views, correctness fixtures and measurement tables
through one `psql` session. Optional indexes on the development tables are created
inside the benchmark transaction and rolled back. Scaling instead copies expenses
and participants into temporary tables, preserving their indexes and analyzing
the copies. UUIDs are remapped; no seed records are edited. Disconnecting on an
error also rolls back the transaction. Index creation can take ordinary DDL locks.

The JSON output includes PostgreSQL version/settings, existing indexes, selected
IDs/cutoff, every trial's complete execution plan and median summaries. Large runs
can generate tens of megabytes of plan output; keep those artifacts outside Git.

## Dataset and methodology

Measured on 2026-10-19, PostgreSQL 18.4, `work_mem = 4 MB`, `shared_buffers = 128 MB`,
JIT enabled, and server timezone `Poland`.

`SEED_STATISTICS.md` reports 150 users, 150 groups and 13,211 generated expenses.
The actual database has **17,830 expenses and 65,914 participant rows**, including
settlements and subsequent development records. There are 1,333 soft-deleted
expenses and no expenses later than the benchmark's wall-clock time. Separate
fixtures exercise the exclusion of future-dated expenses.

Workloads cover all users, a busy/median/quiet user ranked by non-self participant
contributions, the group with the most expenses, and the most frequent directed
participant/payer pair. Each is queried for:

- All history.
- A closing balance before the median non-deleted expense timestamp.
- Net movement in the preceding 30 days, using an inclusive start/exclusive end.

The original view's SQL is read from the repository. For dated comparisons, the
date condition is inserted **inside its base aggregation**: filtering the existing
aggregate timestamps would be an incorrect baseline. All-history results are also
compared to the actual deployed `public."BalanceView"`.

Measurements use `EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, FORMAT JSON)`. Variants are
visited in a deterministic mixed order every round. Tables below show **median
database execution milliseconds**, excluding planning, transport, Prisma decoding,
related-object fetching and debt simplification. Planning was generally around
0.2–0.5 ms. The unscaled measurements are warm-cache measurements, not cold-start
or concurrent-load tests. SQL uses literal predicates; prepared generic plans and
Prisma-generated relation queries are not measured here.

## Query shapes

| Variant                  | Description                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `original`               | Current canonical-pair aggregate CTE, referenced twice for mirroring                                                            |
| `not-materialized`       | Original SQL with `AS NOT MATERIALIZED`                                                                                         |
| `canonical-reduce-first` | Plain canonical contribution view; explicit scope/date filter before aggregation; mirror the reduced rows with `LATERAL VALUES` |
| `union-entries`          | Two directed contribution branches; filter and aggregate once                                                                   |
| `lateral-entries`        | One expense/participant join; mirror each contribution with `LATERAL VALUES`; filter and aggregate                              |
| `dated-aggregate`        | Aggregate the directed view per exact expense timestamp, then aggregate again after filtering                                   |
| `intervals`              | Running totals with `validFrom`/`validTo`, queried as snapshot rows                                                             |

The canonical variant explicitly applies canonical user/pair scope predicates;
those results do not imply PostgreSQL derives those predicates automatically from
an outer directed-user filter. Intervals are measured only for snapshots; period
movement would need two snapshots or another query path. The dated variant uses
exact timestamps, not truncated UTC days, so arbitrary user-timezone cutoffs remain
expressible.

## Seeded database results

Nine measured trials after two warmup rounds. "Indexed entries" has both proposed
indexes; "entries" uses only the database's existing indexes.

| Workload                        |   Original | Entries | Indexed entries | Indexed intervals |
| ------------------------------- | ---------: | ------: | --------------: | ----------------: |
| Busy user, all history          |     28.215 |  12.228 |       **8.960** |            11.090 |
| Typical user, all history       |     28.333 |  11.576 |       **8.021** |             8.868 |
| Quiet user, all history         |     27.967 |   5.979 |       **2.432** |             2.517 |
| Friend pair, all history        |     28.387 |   5.259 |       **0.523** |             0.675 |
| Group, all history              |     28.404 |  12.460 |      **12.547** |            16.561 |
| Busy user, historical cutoff    |     18.319 |  11.534 |       **8.013** |            11.199 |
| Typical user, historical cutoff |     18.070 |   5.867 |       **2.366** |             9.097 |
| Friend pair, historical cutoff  |     18.558 |   0.673 |       **0.459** |             0.683 |
| Busy user, 30-day movement      |      7.527 |   4.058 |       **0.530** |                 — |
| Typical user, 30-day movement   |      7.546 |   3.833 |       **0.370** |                 — |
| Group, 30-day movement          |      7.873 |   0.329 |       **0.208** |                 — |
| All users, all history          | **28.368** |  55.754 |          57.011 |           220.127 |

The separate participant-index-only run (five trials) measured busy-user history
at 9.071 ms and the friend pair at 0.516 ms. Adding the date index primarily helps
short ranges: busy-user 30-day movement improved from 1.687 ms with that participant
index alone to 0.530 ms with both indexes. These are separate runs, so small
differences should not be interpreted as precise gains.

For broad all-history aggregation, the canonical reduction-first variant measured
29.159 ms with both indexes, essentially matching the current 28.443 ms. For the
largest group it measured 6.238 ms versus the entries view's 12.547 ms. It is a
possible later group-specific optimization, but is not necessary to outperform the
existing view, and adds another access shape.

### What the plans show

- **The original really does materialize the CTE.** For busy user 36 it aggregates
  43,593 live non-self contributions into 4,100 canonical balances, then scans that
  result twice. The scans discard 4,044 and 4,074 rows to return just 82 balances.
- **The entries view pushes predicates into its branches.** With the participant
  index, that busy-user plan uses an index-only participant scan and the existing
  payer index. Only 1,730 directed contributions reach the final hash aggregate,
  which produces the same 82 balances. Some joins still use sequential scans: this
  design does not guarantee that every query reads only matching physical rows.
- **Mirroring after reduction wins for broad queries.** The unfiltered entries
  query processes both directed branches and is about twice as expensive. View
  expansion does not automatically move the aggregate before mirroring.
- **Single-scan SQL is not necessarily faster.** `lateral-entries` measured
  38.963 ms for the indexed busy-user query, versus `union-entries` at 8.960 ms.
  The lateral output filter is less useful for restricting the base scans.
- **`NOT MATERIALIZED` is not a blanket fix.** Busy-user history was 22.603 ms and
  broad history was 56.180 ms with both indexes: duplicated reduction outweighed
  the pushdown benefit in those cases.
- **Extra aggregation/window stages have a cost.** Unfiltered timestamp buckets
  took 126.982 ms; intervals took 220.127 ms and wrote 1,352 temporary blocks. An
  older cutoff cannot be pushed below a window when doing so changes `lead` or
  running-total semantics. User/group partition filters can still push down.

## Tenfold volume check

Five trials after two warmups; both indexes enabled. Temporary copies contain
178,300 expenses and 659,140 participants. They duplicate the existing history
under new expense UUIDs; user count, timestamp diversity and output cardinality
stay unchanged. This tests increased history volume, not growth in the social
graph. In particular, repeated timestamps favor the interval view's initial
timestamp aggregation.

Temporary tables use PostgreSQL local buffers, unlike the shared buffers used by
the base tables, and do not have identical parallel-scan behavior. Treat these
numbers as a within-run stress comparison rather than an exact production scaling
forecast. The output records local reads/hits as well as shared reads/hits and
temporary spills; zero shared reads does not imply zero I/O in this run.

| Workload                        |    Original |     Entries | Intervals |
| ------------------------------- | ----------: | ----------: | --------: |
| Busy user, all history          |     400.971 |  **99.244** |   102.492 |
| Typical user, historical cutoff |     186.714 |  **26.017** |    85.672 |
| Friend pair, all history        |     390.061 |  **15.570** |    16.554 |
| Group, all history              |     391.466 | **117.120** |   122.635 |
| Busy user, 30-day movement      |      59.166 |  **11.275** |         — |
| Group, 30-day movement          |      59.484 |   **1.039** |         — |
| All users, all history          | **398.424** |     824.570 |  1235.614 |

The same selective/broad tradeoff persists at this volume.

## Correctness checks

Unscaled runs pass **111 comparisons**; scaled runs pass 110 because comparing the
scaled data directly to the unscaled deployed view is deliberately omitted.

- Every alternative matches the reference in both directions using `EXCEPT ALL`.
  This checks amounts, row multiplicity, null groups, currencies and aggregate
  creation/update timestamps, retaining zero balances.
- Independent expected-value fixtures cover opposite-direction expenses,
  settlement-like negative amounts, payer self-shares, zero shares, deleted rows,
  different groups/currencies, repeated timestamps, and expenses created before
  their effective date. The fixture cutoff excludes an expense exactly at the
  upper bound.
- A period fixture verifies inclusive start/exclusive end behavior.
- A New York spring-forward fixture includes exactly the transactions inside a
  23-hour local day. A separate check verifies a 25-hour autumn day boundary.
- A value of 9,007,199,254,740,993 verifies integer precision beyond JavaScript's
  safe number range. Financial assertions stay in PostgreSQL `bigint` arithmetic.

These checks validate the SQL prototypes; existing application integration tests
will be needed when wiring a selected view into routers and simplification.

## Minimal production integration

1. Add `BalanceEntryView` using the measured `bench_entries` SQL and declare its
   scalar fields in Prisma. It is a contribution view, not an already netted
   balance view. Optionally expose `expenseId` for traceability.
2. Add a shared balance-query service using typed `groupBy`, with optional
   `fromDate` and `toDateExclusive`. Normalize `_sum.amount` and `_min`/`_max`
   timestamps back into the existing balance object shape. Keep metadata fetching
   batched where current queries use `include`.
3. Resolve the viewer's IANA timezone once per request. Default the upper bound to
   **the start of the following local calendar day converted to UTC**, so expenses
   dated today count throughout that day. Explicit range queries use the same
   conversion. Keep timezone conversion on bound values, not on every stored date.
4. Query `expenseDate >= from AND expenseDate < to`, omitting the lower bound for
   a closing balance. Existing `DateTime` columns are `timestamp without time zone`;
   pass UTC-represented timestamps consistently with Prisma's `Date` storage.
   Do not rely on the PostgreSQL session timezone to interpret those values.
5. Filter dates before grouping and before debt simplification. Simplify the full
   group graph using one viewer cutoff, not an independently dated graph for each
   member. Apply balance predicates such as `amount != 0` **after aggregation**;
   a nonzero contribution does not imply a nonzero net balance. Avoid a separate
   balance query per group/currency by batching scopes where possible.
6. Keep current endpoint response shapes. Propagate timezone in request context
   and add optional date inputs where needed. Invalidate timezone-header-derived
   balances when the effective timezone/day changes, including local midnight.
   Preserve the all-history view for unscoped queries that need its faster shape.

Proposed indexes, measured transactionally by the runner:

```sql
CREATE INDEX "ExpenseParticipant_userId_expenseId_idx"
ON "ExpenseParticipant" ("userId", "expenseId") INCLUDE (amount);

CREATE INDEX "Expense_expenseDate_live_idx"
ON "Expense" ("expenseDate") WHERE "deletedAt" IS NULL;
```

The historical `get_balance_at_date` function currently filters `createdAt` and
has migration-related semantics. Keep it distinct from an expense-date query;
neither path reconstructs overwritten historical edits without versioned data.

## References

- [PostgreSQL view rewriting](https://www.postgresql.org/docs/18/rules-views.html)
- [CTE materialization](https://www.postgresql.org/docs/18/queries-with.html#QUERIES-WITH-CTE-MATERIALIZATION)
- [Using EXPLAIN](https://www.postgresql.org/docs/18/using-explain.html)
- [Issue #604](https://github.com/oss-apps/split-pro/issues/604)
