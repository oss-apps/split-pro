# Testing strategy

Fast checks, database integration tests, and browser tests are independent. CI runs each in
its own job. Fast checks require no running database; the other jobs provision disposable
PostgreSQL with the same launcher used locally.

## Commands

| Purpose                      | Command                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| Formatting                   | `pnpm prettier --check .`                                                 |
| Lint                         | `pnpm lint`                                                               |
| Types                        | `pnpm tsgo --noEmit`                                                      |
| Unit/component tests         | `pnpm test`                                                               |
| One unit file                | `pnpm test src/tests/simplify.test.ts`                                    |
| Prepare integration database | `pnpm test:db:up`                                                         |
| Integration tests            | `pnpm test:integration`                                                   |
| One integration file         | `pnpm test:integration src/tests/integration/expense.integration.test.ts` |
| Stop integration database    | `pnpm test:db:down`                                                       |
| Prepare browser database     | `pnpm test:e2e:db:up`                                                     |
| Install Chromium             | `pnpm exec playwright install chromium` (CI adds `--with-deps`)           |
| Chromium E2E                 | `pnpm test:e2e --project=chromium`                                        |
| One browser file             | `pnpm test:e2e tests/e2e/group-expense.spec.ts`                           |
| Stop browser database        | `pnpm test:e2e:db:down`                                                   |
| Production build             | `pnpm build`                                                              |

Pass arguments directly to pnpm scripts: an extra `--` is forwarded to Playwright and stops
option parsing. `pnpm test:e2e --list` lists tests without starting a server.

## Local databases and worktrees

The launchers create separate PostgreSQL instances with `pg_cron` preloaded and its database
name configured, wait for startup, and deploy Prisma migrations. Docker is used outside Nix;
`nix develop` uses native PostgreSQL and keeps its state under `.direnv/test-postgres-<port>`.
The Nix runtime supplies Chromium's Linux libraries; install the browser once with the command
above. Re-enter `nix develop` after changing the flake.

| Suite       | Environment variable | Default port | Default database        |
| ----------- | -------------------- | ------------ | ----------------------- |
| Integration | `TEST_DATABASE_URL`  | 55439        | `splitpro_harness_test` |
| Browser     | `E2E_DATABASE_URL`   | 55440        | `splitpro_e2e_test`     |

Both default URLs use `splitpro:test-password@127.0.0.1`. The launcher, Jest, and Playwright
load the root `.env` file before reading these variables; exported shell
variables take precedence. Application `DATABASE_URL` is not used to select test databases.
Use distinct test ports per worktree and per suite, and a database name ending in `_test`.
Native PostgreSQL supports IPv4/IPv6 loopback; Docker requires IPv4 loopback. A PostgreSQL
instance can host `pg_cron` in only one configured database, so suites cannot share a port.
`E2E_BASE_URL` defaults to `http://127.0.0.1:3176`; give each concurrent browser run its own
local HTTP port. Playwright starts its own app and refuses to reuse another running server.

Tests only accept local disposable `_test` databases. Integration resets application tables
before each test. Browser fixtures clean only their own users, groups, sessions, and expenses.
An advisory lock rejects competing integration suites against the same database. Docker teardown
removes disposable volumes; native teardown stops the server and preserves state for reuse.

## Reusable helpers and test selection

- `jest.shared.ts` owns aliases, mock clearing, SWC configuration, and ESM-package handling.
  Unit tests default to Node. DOM tests declare `/** @jest-environment jsdom */`; the unit
  setup loads browser shims and cleanup only in that environment.
- `renderWithProviders` supplies a fresh query client, router, session context, theme, and
  currency helpers. Pass `router`, `session`, or `sessionLoading` for individual scenarios.
  Translations use the real English resources with interpolation and namespaces. Store state,
  browser storage, mounted components, and managed query clients are automatically reset.
- `databaseFactories.ts` builds typed users/groups and expense inputs for integration and E2E.
  API lifecycle tests use the real caller and accounting; direct database seeding is for
  arranging scenarios, not validating writes.
- Integration setup owns one Prisma client per Jest suite and disconnects it after the suite.
  Only auth-session lookup and notification delivery are mocked. Nano ID and SuperJSON are real.
- Playwright fixtures own a client per worker and a new authenticated scenario per test. There
  are no shared authentication files or setup dependency. Cookies follow the configured host.
  The transport test checks BigInt/Date serialization through the actual Next.js API endpoint.

`pnpm test` selects `src/**/*.{test,spec}.{ts,tsx}` except `src/tests/integration/`.
`pnpm test:integration` selects that integration directory only. Playwright selects `tests/e2e/`.
Failures retain traces, screenshots, videos, and the HTML report even when local retries are
disabled. CI uploads `test-results/e2e` and `playwright-report` on failure and always stops its
database. Do not run integration resets against the browser database or a shared server.

## Agent workflow

1. Read the relevant helpers before adding fixtures or mocks; extend them rather than copying
   test setup into individual suites.
2. Run the narrowest affected test first, then formatting, lint, types, and the unit suite.
3. Prepare disposable databases before integration/E2E; preserve failure artifacts for diagnosis.
4. Assert persisted accounting and permissions, including rejected mutations leaving state intact.
5. Report exact failures; do not weaken assertions, test selection, or database guards to pass CI.
