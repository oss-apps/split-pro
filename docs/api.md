# SplitPro Public REST API

SplitPro exposes a small, versioned REST API for integrations (e.g. syncing
expenses to a budgeting tool). The API is served at `/api/v1` and documented
interactively at **`/api/docs`** (Scalar), backed by the machine-readable
OpenAPI 3.1 spec at **`/api/openapi.json`**.

## Authentication

1. In the app, open **Account → API keys** and create a key. Optionally set an
   expiry date. The plaintext key (`spro_…`) is shown exactly once; only a
   SHA-256 hash is stored server-side.
2. Send the key with every request:

   ```
   Authorization: Bearer spro_…
   ```

   The `X-API-Key: spro_…` header is also accepted. Requests without a valid,
   unexpired key receive `401`.

API keys act with your user's permissions: every endpoint only returns data
you are part of, and writes run the same permission checks as the app.

## Endpoints

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

All requests go to `https://<your-host>/api/v1/<endpoint>`, e.g.
`GET /api/v1/user.me`.

### Input formats

GET endpoints accept individual query params (`?groupId=150&limit=20`), a
plain JSON object (`?input={"groupId":150}`), or a native superjson envelope.
POST bodies are plain JSON; a superjson envelope also works when calling from
a tRPC client.

Because JSON has no BigInt or Date type, monetary amounts accept numbers or
numeric strings (strings keep full precision beyond `Number.MAX_SAFE_INTEGER`)
and are returned as numbers; timestamps are ISO 8601 strings.

### Pagination

List endpoints use offset pagination:

- Input: `?limit=20&offset=0` (defaults `limit=20`, `offset=0`, max `limit=100`)
- Response: `{ items: […], pagination: { total, limit, offset, hasMore } }`

### Example

```bash
curl -H "Authorization: Bearer spro_…" \
  'https://splitpro.example.com/api/v1/expense.getGroupExpenses?groupId=16&limit=10'
```

```bash
curl -X POST -H "Authorization: Bearer spro_…" -H "Content-Type: application/json" \
  -d '[{"name":"Lunch","currency":"EUR","groupId":null,"amount":4200,"paidBy":1,
        "category":"general","splitType":"EQUAL",
        "participants":[{"userId":1,"amount":2100},{"userId":2,"amount":-2100}],
        "expenseDate":"2026-10-25T12:00:00Z"}]' \
  'https://splitpro.example.com/api/v1/expense.addOrEditExpense'
```

Note the participant amounts follow the app's stored sign convention: the
payer's entry is `amount − their share` (positive), every other participant's
entry is their negated share. The example above is a `4200` expense split
equally between user 1 (payer) and user 2, so each share is `2100`.

## Maintenance (for developers)

- The API router is `src/server/api/apiRouter.ts` — a curated subset of the
  app procedures, shared via the exported method records in the router files.
- Regenerate the OpenAPI spec after changing any procedure with
  `pnpm gen:openapi`. The pre-push hook fails if the committed
  `src/server/api/openapi.generated.json` is out of date, and `pnpm build`
  regenerates it.
- `/api/docs` loads the Scalar bundle pinned to an exact version with a
  subresource-integrity hash (see `src/pages/api/docs.ts` for upgrade steps).
