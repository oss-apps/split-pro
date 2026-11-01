# Expense history pagination

Activity, friend history and group history use the same `{ items, nextCursor }`
contract. Requests default to 50 rows and accept a limit from 1 to 100. Each query
fetches one extra row to detect whether another page exists, without a count query.

Cursors contain the last returned date and expense UUID. Histories sort by
`expenseDate DESC, id DESC`; activity retains its `createdAt DESC` ordering with
an expense ID tie breaker. The next page applies a strict value boundary rather
than looking up the cursor row, so deleting that row does not interrupt scrolling.
Authorization and the existing deletion/conversion predicates apply to every page.

`src/utils/pagination.ts` provides the shared schema, boundary, page construction,
flattening and explicit full-history collection. `InfiniteScroll` observes the end
of the list inside MainLayout's scroll container, exposes a keyboard-accessible
load button and pauses automatic fetching after errors. Pages own the query and
row rendering, including month separators across page boundaries.

For future server-side search or filters, extend the endpoint input alongside
`paginationInput`, apply the criteria together with the cursor boundary in the
database query, and pass those criteria to `useInfiniteQuery`. tRPC/React Query
keys include these inputs, so changing criteria selects a separate first-page
query. Do not filter only the rows already loaded in the browser. A new sort order
must also define a matching stable cursor and boundary predicate.

CSV export collects all pages on demand through bounded requests, independently
of how far the user has scrolled. Group details fetch the earliest expense date
separately with `take: 1` for the first-expense statistic. Balance totals remain
independent of the loaded pages.

The scroll list appends rows; it does not virtualize them. Loading every page can
still create a large DOM. Concurrent edits that change an expense's sort date can
move it across the cursor boundary; refreshing reconstructs the history.
