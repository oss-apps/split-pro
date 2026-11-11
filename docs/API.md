# SplitPro Public REST API

SplitPro exposes a small, versioned REST API for integrations (e.g. syncing
expenses into a budgeting tool). The API is served at `/api/v1` and documented
interactively at **`/api/docs`** (Scalar), backed by the machine-readable
OpenAPI 3.1 spec at **`/api/openapi.json`**.

## Authentication

1. In the app, open **Account → API keys** and create a key. Optionally set an
   expiry date. The plaintext key (`spro_…`) is shown exactly once; only its
   SHA-256 hash is stored server-side.
2. Send the key with every request:

   ```
   Authorization: Bearer spro_…
   ```

   An `X-API-Key: spro_…` header is also accepted. Requests without a valid,
   unexpired key receive `401`.

API keys act with your user's permissions: every endpoint only returns data
you are part of, and writes run the same permission checks as the app.

The number of keys per user is limited by `API_KEYS_MAX_PER_USER` (default
`10`, see [Configuration](CONFIGURATION.md)).

## Endpoints

All requests go to `https://<your-host>/api/v1/<endpoint>`, e.g.
`GET /api/v1/user.me`.

| Endpoint                        | Method | Description                                     |
| ------------------------------- | ------ | ----------------------------------------------- |
| `user.me`                       | GET    | Authenticated user profile                      |
| `user.getFriends`               | GET    | Friends with balances                           |
| `user.getOwnExpenses`           | GET    | Expenses paid by you **(paginated)**            |
| `user.getBalancesWithFriend`    | GET    | Per-group balances with a friend                |
| `user.getFriend`                | GET    | Friend profile + default split                  |
| `group.getAllGroups`            | GET    | All groups you belong to                        |
| `group.getGroupDetails`         | GET    | Single group with members and balances          |
| `expense.getBalances`           | GET    | Per-friend balances across all groups           |
| `expense.getAllExpenses`        | GET    | All expenses you participate in **(paginated)** |
| `expense.getExpensesWithFriend` | GET    | Expense history with a friend **(paginated)**   |
| `expense.getGroupExpenses`      | GET    | All expenses in a group **(paginated)**         |
| `expense.getExpenseDetails`     | GET    | Full expense detail                             |
| `expense.addOrEditExpense`      | POST   | Create or update expenses (array body)          |
| `upload`                        | POST   | Upload a receipt image (`multipart/form-data`)  |

### Why only these endpoints?

The API is rolled out gradually. Every endpoint becomes a public contract that
integrations rely on, so it is only added once there is a use case for it, a
plain-JSON friendly input (BigInt amounts and dates do not exist in JSON) and
tests. The first step covers reading balances and expenses (e.g. syncing them
into a budgeting tool) and adding or editing expenses including receipts (e.g.
importing them from elsewhere).

The remaining tRPC procedures are not exposed yet:

| Procedures                                                                                                                                                                                                                                                                                                                       | Reason                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `expense.deleteExpense`, `expense.addOrEditCurrencyConversion`, `expense.addComment`, `expense.editComment`, `expense.deleteComment`                                                                                                                                                                                             | Further expense writes; next candidates for the rollout                                                                             |
| `expense.getRecurringExpenses`, `expense.updateRecurrence`, `expense.deleteRecurrence`                                                                                                                                                                                                                                           | Recurrences are pg_cron jobs; the API needs a stable representation of the schedule first                                           |
| `group.create`, `group.joinGroup`, `group.addMembers`, `group.leaveGroup`, `group.updateGroupDetails`, `group.toggleSimplifyDebts`, `group.toggleArchive`, `group.delete`, `group.upsertDefaultSplit`, `group.clearDefaultSplit`                                                                                                 | Group management; planned after expense writes                                                                                      |
| `user.inviteFriend`, `user.deleteFriend`, `user.upsertFriendDefaultSplit`, `user.clearFriendDefaultSplit`, `user.updateUserDetail`                                                                                                                                                                                               | Friend and profile management; planned after group management                                                                       |
| `group.getAllGroupsWithBalances`, `group.getGroupTotals`, `expense.getCumulatedBalances`, `user.getUserDetails`, `user.getBalanceSettings`                                                                                                                                                                                       | Read endpoints that are mostly covered by the exposed ones; added on request                                                        |
| `user.deleteAccount`, `user.downloadData`, `user.listApiKeys`, `user.createApiKey`, `user.revokeApiKey`                                                                                                                                                                                                                          | Account-level operations stay session-only, so a leaked API key can neither delete the account, export all data nor create new keys |
| `user.updatePushNotification`, `user.deletePushNotification`, `user.sendTestPushNotification`, `user.getWebPushPublicKey`, `user.submitFeedback`, `user.importUsersFromSplitWise`, `user.getDiscoverableUsers`, `expense.getRecurrencePreview`, `expense.getCurrencyRate`, `expense.getBatchCurrencyRates`, `bankTransactions.*` | App-internal helpers for the UI, push notifications, imports and bank connections; not useful for integrations                      |

Uploaded files can be attached via the API, but downloading them
(`/api/files/…`) still requires an app session.

### Input formats

GET endpoints accept individual query params (`?groupId=150&limit=20`), a
plain JSON object (`?input={"groupId":150}`), or the native superjson envelope.
Nested objects such as the pagination cursor use brackets
(`?cursor[date]=…&cursor[id]=…`). POST bodies are plain JSON; the superjson
envelope also works when calling from a tRPC client.

Because JSON has no BigInt or Date type, monetary amounts accept numbers or
numeric strings (strings keep full precision beyond `Number.MAX_SAFE_INTEGER`)
and are returned as numbers; timestamps are ISO 8601 strings. Amounts are in the
smallest currency unit (e.g. cents).

### Pagination

List endpoints use the same cursor pagination as the app:

- Input: `limit` (1–100, default `50`) and optionally `cursor`.
- Response: `{ items: […], nextCursor?: { date, id } }`. Pass `nextCursor` as
  `cursor` to fetch the next page. Without `nextCursor` you reached the last
  page.

```bash
curl -H "Authorization: Bearer spro_…" \
  'https://splitpro.example.com/api/v1/expense.getGroupExpenses?groupId=16&limit=10'

curl -g -H "Authorization: Bearer spro_…" \
  'https://splitpro.example.com/api/v1/expense.getGroupExpenses?groupId=16&limit=10&cursor[date]=2026-10-25T12:00:00.000Z&cursor[id]=0d9c…'
```

(`-g` stops curl from treating the brackets as a glob pattern.) The cursor
marks a position, not a page number, so pages stay consistent while
expenses are added or deleted.

### Adding an expense

```bash
curl -X POST -H "Authorization: Bearer spro_…" -H "Content-Type: application/json" \
  -d '[{"name":"Lunch","currency":"EUR","groupId":null,"amount":4200,"paidBy":1,
        "category":"general","splitType":"EQUAL",
        "participants":[{"userId":1,"amount":2100},{"userId":2,"amount":-2100}],
        "expenseDate":"2026-10-25T12:00:00Z"}]' \
  'https://splitpro.example.com/api/v1/expense.addOrEditExpense'
```

A participant's `amount` is their balance from this expense: positive is the
amount they are owed by the others, negative the amount they owe. The example
is a `4200` expense paid by user 1 and split equally with user 2, so user 1 is
owed `2100` and user 2 owes `2100`. For a negative expense (e.g. a refund) the
signs flip. As in the app, the participant amounts add up to zero.

Pass an `expenseId` to edit an existing expense instead of creating one.

### Uploading a receipt

Upload the image first, then pass the returned key as `fileKey` when creating
or editing the expense:

```bash
curl -X POST -H "Authorization: Bearer spro_…" -F 'file=@receipt.jpg' \
  'https://splitpro.example.com/api/v1/upload'
# → {"key":"1/0d9c….webp"}
```

The image is converted to WebP. The maximum size is `UPLOAD_MAX_FILE_SIZE_MB`
(see [Configuration](CONFIGURATION.md)).

## Health checks

Two unauthenticated endpoints outside `/api/v1` (and outside the OpenAPI spec)
are meant for load balancers and orchestrators:

| Endpoint           | Checks                                         | Response                                                                             |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| `GET /api/healthz` | Liveness; the process answers (no database)    | `200 {"status":"ok"}`                                                                |
| `GET /api/readyz`  | Readiness; database reachable within 3 seconds | `200 {"status":"ok"}` or `503 {"status":"error","message":"Database not reachable"}` |

Use `healthz` to decide whether to restart the container and `readyz` to decide
whether to route traffic to it. Restarting on a database outage would not help
and could restart all replicas at once.

## Maintenance (for developers)

- The API router is `src/server/api/apiRouter.ts` — a curated subset of the
  app procedures, shared via exported method records in the router files. When
  exposing a procedure, move it from the table above to the endpoint table.
- `POST /api/v1/upload` is a plain Next.js route (`src/pages/api/v1/upload.ts`)
  and documented by hand in `scripts/generate-openapi.ts`.
- Regenerate the OpenAPI spec after changing any exposed procedure with
  `pnpm gen:openapi`. The pre-push hook fails if the committed
  `src/server/api/openapi.generated.json` is out of date, and CI checks it too.
- `/api/docs` loads the Scalar bundle pinned to an exact version with a
  subresource-integrity hash (see `src/pages/api/docs.ts` for upgrade steps).
