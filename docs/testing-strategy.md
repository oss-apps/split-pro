# Testing strategy

SplitPro has three deliberately independent test surfaces. Fast checks fail quickly without
requiring PostgreSQL; database and browser checks each provision their own disposable service.

## Command matrix

| Purpose              | Exact command                                                             | Selection                                                           |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Formatting           | `pnpm prettier --check .`                                                 | All supported files                                                 |
| Lint                 | `pnpm lint`                                                               | Oxlint project sources                                              |
| Types                | `pnpm tsgo --noEmit`                                                      | TypeScript project                                                  |
| Unit/component tests | `pnpm test`                                                               | `src/**/*.{test,spec}.{ts,tsx}`, excluding `src/tests/integration/` |
| One unit file        | `pnpm test src/tests/simplify.test.ts`                                    | The named file                                                      |
| Integration tests    | `pnpm test:integration`                                                   | `src/tests/integration/**/*.{test,spec}.{ts,tsx}`                   |
| One integration file | `pnpm test:integration src/tests/integration/expense.integration.test.ts` | The named file                                                      |
| Chromium E2E         | `pnpm test:e2e -- --project=chromium`                                     | `tests/e2e/`, including setup dependency                            |
| One E2E file         | `pnpm test:e2e -- tests/e2e/group-expense.spec.ts`                        | The named file                                                      |
| Production build     | `pnpm build --no-lint`                                                    | Next.js production build                                            |

The pull-request `Check` workflow runs formatting, lint, types, unit/component tests, and the
build. `Integration Tests` and `E2E Tests` are separate jobs and do not depend on `Check` or on
each other. E2E failures upload `test-results/e2e` and `playwright-report`.

## Database safety

Integration and E2E tests are destructive by design: they create, update, and delete records.
Use only a local disposable PostgreSQL database whose database name ends in `_test`. The
integration harness also requires a local host (`localhost`, `127.0.0.1`, or `::1`) and refuses
other URLs before tests run. CI creates a new `splitpro_harness_test` service for each job and
prepares it with:

```bash
pnpm exec prisma migrate deploy
```

For local work, copy `.env.example`, use a dedicated container/database/port per worktree, and
set `DATABASE_URL` (and `E2E_DATABASE_URL` for Playwright) to that `_test` database. Do not use
`pnpm db:push`, reset, seed, or these test commands against development, staging, or production.
When the disposable container is no longer needed, stop it with the project’s test-container
workflow; never clean it by deleting data from a shared server.

## Agent workflow

1. Read this document and the existing harness/configuration before changing tests.
2. Make the smallest change in the owning packet; keep application, Prisma, Jest, manifest, and
   lockfile changes out of CI/documentation work.
3. Run the narrowest affected command first, then `pnpm prettier --check .` and any available
   fast checks. Run integration/E2E only with a disposable `_test` database.
4. For E2E failures, preserve and inspect Playwright traces, screenshots, videos, and reports.
5. Report exact commands and failures; do not weaken selection or database guards to make CI pass.
