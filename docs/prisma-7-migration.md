# Prisma 7 migration

The CLI, client, and PostgreSQL adapter are resolved to **7.10.1**, with the existing
caret range policy. TypeScript remains at 5.7.3: the published Prisma 7.10.1 packages
require TypeScript >=5.4.0 and Node.js `^20.19 || ^22.12 || >=24.0`. Both the local
Node.js 22 runtime and the production image's Node.js 22.16.0 satisfy that requirement.

## Application and tooling

- `prisma.config.ts` owns the CLI datasource URL, loads an optional `.env` using Node's
  built-in loader, and retains the external `cron` tables and seed configuration.
  Generation can run without database credentials, including inside Docker.
- The supported `prisma-client-js` generator is retained. Existing `@prisma/client`
  imports, browser-safe enums, NextAuth integration, and generated model types keep
  their entrypoints. The generated client uses Prisma 7's Rust-free query compiler.
- All clients (application singleton, seed, integration, and browser fixtures) use
  `createDatabaseAdapter`. The adapter supplies `pg` and `@types/pg` transitively;
  neither needs a separate direct dependency.
- `db:dev` and `db:push` explicitly regenerate the client. Prisma 7 no longer seeds
  automatically: use `pnpm db:seed` for a new development database or after a reset.
- Production still applies the bundled SQL migrations through instrumentation; the
  standalone image does not need the Prisma CLI at runtime.
- Seed writes run in bounded batches rather than queuing thousands of transactions
  behind pg's pool timeout. Both seed and application clients disconnect on completion.

## Connection settings

The shared adapter translates `connection_limit`, `connect_timeout`,
`max_idle_connection_lifetime`, `max_connection_lifetime`, and `schema` URL options.
`socket_timeout` is implemented with PostgreSQL's statement timeout. The integration
suite's explicit one-connection limit still protects its session-level advisory lock.
Connection and idle timeout defaults remain 5 seconds and 300 seconds respectively.

Prisma 7 uses the driver's pool: an unspecified connection limit now uses pg's default
of 10 rather than Prisma 6's CPU-derived size. pg has one connection/acquisition timeout
setting rather than Prisma 6's separate `pool_timeout`; `connect_timeout` controls it.
TLS validation uses pg's defaults. Deployments needing a private CA should supply the
appropriate trust configuration, such as `NODE_EXTRA_CA_CERTS`.

## Official sources

- [Prisma 7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Driver pool settings and v6 comparison](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool)
- [Prisma releases](https://github.com/prisma/orm/releases): reviewed the v7 release
  series, including the PostgreSQL joined-BigInt precision fix in 7.3, query-plan
  caching in 7.4, transaction fixes, and Studio security hardening in 7.10.0.
- [7.10.0 release notes](https://github.com/prisma/orm/releases/tag/7.10.0)
- Exact package metadata: [CLI](https://registry.npmjs.org/prisma/7.10.1),
  [client](https://registry.npmjs.org/@prisma/client/7.10.1), and
  [adapter](https://registry.npmjs.org/@prisma/adapter-pg/7.10.1).
  A separate official GitHub 7.10.1 release page was unavailable (HTTP 404) during
  migration; no patch-specific changelog is assumed.

## Regression verification

Unit coverage checks client initialization without build-time credentials. PostgreSQL
integration coverage verifies exact amounts above `Number.MAX_SAFE_INTEGER` through
joined participants and balance views, alongside existing accounting and rollback tests.
`pnpm test:docker --e2e` builds the checkout, checks fresh and recreated production
containers, migrations, pg_cron and persistence, then runs Chromium against that image.
