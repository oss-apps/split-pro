# AGENTS.md - Coding Agent Guidelines for SplitPro

## Build/Lint/Test Commands

### Development

```bash
pnpm dev           # Start dev server with Turbopack
pnpm d             # Full dev setup (install, docker, migrate, dev)
pnpm dx            # Setup dependencies (install, docker up, migrate dev)
pnpm dx:up         # Start Docker containers
pnpm dx:down       # Stop Docker containers
```

### Worktrees

- when using git worktrees, store them in the .worktrees directory in the root of the project folder
- when creating a worktree, copy `.env` from the root project into the worktree
- update worktree-local app urls/port to avoid conflicts with the main workspace:
  - set `NEXTAUTH_URL` and `NEXTAUTH_URL_INTERNAL` to a unique localhost port
  - run dev server with that same port (for example `pnpm dev --port 3174`)
- use a separate postgres instance per worktree (different host port + db name)
  - set unique values in the worktree `.env`: `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_CONTAINER_NAME`, `DATABASE_URL`
  - start dedicated db container, for example:
    - `docker run -d --name <unique-container-name> -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=strong-password -e POSTGRES_DB=<worktree-db> -p <worktree-port>:5432 ossapps/postgres:17.7-trixie postgres -c shared_preload_libraries=pg_cron -c cron.database_name=<worktree-db> -c cron.timezone=UTC`
  - enable pg_cron extension once: `psql "postgresql://postgres:strong-password@localhost:<worktree-port>/<worktree-db>" -c "CREATE EXTENSION IF NOT EXISTS pg_cron;"`
  - initialize schema and data: `pnpm exec prisma migrate reset --force && pnpm generate && pnpm db:seed`

### Database

```bash
pnpm db:push       # Push Prisma schema to database
pnpm db:studio     # Open Prisma Studio
pnpm db:dev        # Run Prisma migrations (dev)
pnpm db:seed       # Seed the database
pnpm generate      # Generate Prisma client
```

### Testing

```bash
pnpm test                              # Run all tests
pnpm test:watch                        # Run tests in watch mode
pnpm test src/tests/simplify.test.ts   # Run a specific test file
pnpm test -- -t "test name pattern"    # Run tests matching pattern
```

### Linting & Formatting

```bash
pnpm lint                    # Run oxlint with type-aware checking
pnpm prettier --write .      # Format all files
pnpm prettier --check .      # Check formatting without changes
pnpm tsc --noEmit           # Type check (used in pre-commit)
```

### Building

```bash
pnpm build         # Build for production
```

### CI Pipeline (runs on PRs)

1. `pnpm prettier --check .` - Format check
2. `pnpm lint` - Linting
3. `pnpm tsc --noEmit` - Type checking
4. `pnpm test` - Unit tests
5. `pnpm build --no-lint` - Build verification

## Code Style Guidelines

### Formatting (Prettier)

- Semicolons: required
- Quotes: single quotes
- Trailing commas: all
- Print width: 100 characters
- Tailwind CSS classes are auto-sorted

### TypeScript Configuration

- Strict mode enabled
- Target: ES2022
- `noUncheckedIndexedAccess: true` - handle undefined for index access
- Path aliases:
  - `~/*` maps to `./src/*`
  - `@/*` maps to `./*`

### Import Organization

1. External packages first (react, next, third-party libs)
2. Internal imports using `~/` alias
3. Relative imports for nearby files
4. Use `type` keyword for type-only imports

### Environment Variables

- Server-side vars: Use `env.VAR_NAME` (available only on server).
- Client-side vars: Use `env.NEXT_PUBLIC_VAR_NAME` (exposed to browser, prefixed with `NEXT_PUBLIC_`).
- Defaults: Hardcode in `src/env.ts` using Zod `.default()` for fallback values.

```typescript
import { HeartHandshakeIcon, X } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import React, { useCallback } from 'react';

import { type CurrencyCode } from '~/lib/currency';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';

import { Button } from '../ui/button';
```

### Naming Conventions

- **Components**: PascalCase (`AddExpensePage.tsx`, `Button.tsx`)
- **Utility files**: camelCase (`utils.ts`, `currency.ts`)
- **Test files**: `*.test.ts` pattern
- **Pages**: kebab-case for routes (`import-splitwise.tsx`)
- **Dynamic routes**: `[paramName].tsx`
- **Functions**: camelCase (`calculateParticipantSplit`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_CATEGORY`)
- **Types/Interfaces**: PascalCase (`AddExpenseState`)
- **Hooks**: camelCase with `use` prefix (`useAddExpenseStore`)

### Yoda Conditions

Use literal on the left side for comparisons:

```typescript
if ('authenticated' === status) { ... }
if (0n === amount) { ... }
if ('' === description) { ... }
```

### BigInt Usage

- **All monetary values are BigInt** (cents/smallest unit) to prevent rounding errors
- Use `n` suffix for BigInt literals: `0n`, `1n`, `10000n`
- Use `BigMath` helper (`src/utils/numbers.ts`) for arithmetic: `abs`, `sign`, `min`, `max`, `roundDiv`
- Use `getCurrencyHelpers({ currency, locale })` for display/parsing

### Error Handling

**tRPC API errors:**

```typescript
if (!group) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
}
```

**Client-side errors:**

```typescript
try {
  await mutation.mutateAsync(data);
} catch (error) {
  toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
}
```

**Promise chains:**

```typescript
router.push('/path').catch(console.error);
```

### Functions and Iteration

- **Prefer arrow functions** over function declarations:

  ```typescript
  // Good
  const calculateTotal = (items: Item[]) => items.reduce((sum, item) => sum + item.amount, 0n);

  // Avoid
  function calculateTotal(items: Item[]) { ... }
  ```

- **Prefer iterator methods** over for loops (`map`, `filter`, `reduce`, `forEach`, `find`, `some`, `every`):

  ```typescript
  // Good
  const totals = expenses.filter(e => !e.deletedAt).map(e => e.amount);

  // Avoid
  for (const expense of expenses) { ... }
  ```

- **Prefer early returns** to reduce nesting. Put the shorter/simpler case first:

  ```typescript
  // Good
  const processItem = (item: Item) => {
    if (!item.needsProcessing) {
      return item;
    }

    // Complex processing logic here...
    return processedItem;
  };

  // Avoid
  const processItem = (item: Item) => {
    if (item.needsProcessing) {
      // Complex processing logic here...
      return processedItem;
    } else {
      return item;
    }
  };
  ```

### React Patterns

- Functional components with TypeScript interfaces
- Prefer straightforward components and colocated event handlers. React Compiler handles
  routine memoization in compiled components; use `useMemo`, `useCallback`, or `React.memo`
  when profiling or an explicit identity requirement justifies them.
- Confirm compiler optimization before removing existing manual memoization. The stable
  compiler currently skips some functions containing BigInt literals; preserve their
  memoization and monetary arithmetic. See `docs/react-compiler-migration.md`.
- Avoid handler factories or component extractions solely to prevent inline JSX allocations.
- Zustand for global state, tRPC/React Query for server state
- `cn()` utility for conditional Tailwind classes
- Use `as const` and `satisfies` for fixed arrays/objects

### Test Structure

```typescript
describe('functionName', () => {
  describe('ScenarioGroup', () => {
    it('should do something specific', () => {
      const result = functionName(input);
      expect(result).toBe(expected);
    });
  });
});
```

### Linting Rules (oxlint)

- `no-unused-vars`: warn
- `no-console`: warn (allows info, warn, error, debug, trace in JSX/TSX)
- `sort-imports`: error
- Ignored paths: `prisma/seed.ts`, `src/components/ui/*`

## Tech Stack

- **Framework**: Next.js 15 (Pages Router)
- **Database**: PostgreSQL + Prisma ORM
- **API**: tRPC
- **State**: Zustand + React Query
- **Styling**: Tailwind CSS v4
- **UI**: Radix UI primitives
- **Auth**: NextAuth.js
- **Validation**: Zod
- **i18n**: next-i18next
- **Package Manager**: pnpm

## Key Architecture Notes

- **Double-entry balance accounting**: Every expense creates two balance records (bidirectional)
- **Transaction batching**: Use `db.$transaction(operations)` for expense mutations
- **Split types**: `EQUAL`, `PERCENTAGE`, `SHARE`, `EXACT`, `ADJUSTMENT`, `SETTLEMENT`, `CURRENCY_CONVERSION`
- **Schema typo**: `firendId` (not `friendId`) in GroupBalance - maintain for consistency

## Typescript Migrations

Data migrations too complex for SQL queries run automatically during server startup via `src/instrumentation.ts`.

### Architecture

- **`src/migrations/index.ts`** - Migration runner that checks `AppMetadata.schema_version` and runs pending migrations
- **`src/migrations/{name}.ts`** - Individual migration files exporting an async function

### Adding New Migrations

1. Create a new file `src/migrations/{description}.ts`:

```typescript
import { db } from '~/server/db';

export async function myMigrationFunction(): Promise<void> {
  // Migration logic using the shared db connection
  const records = await db.someModel.findMany({ ... });

  for (const record of records) {
    await db.$transaction(async (tx) => {
      // Atomic operations
    });
  }

  console.log('Migration completed');
}
```

1. Register the migration in `src/migrations/index.ts` by calling it in its respective case block.

### Version Tracking

- Schema version is stored in `AppMetadata` table with key `schema_version`
- Versions are compared lexicographically (semver format: `"2.0.0"`, `"2.1.0"`, etc.)
- Missing version (pre-2.0.0 databases) is treated as needing all migrations

### Key Points

- Migrations run on every server start but are idempotent (version check)
- Use the shared `db` connection from `~/server/db`
- Wrap related operations in `db.$transaction()` for atomicity
- Log progress for visibility during deployment

## Localization

- Only create English translation keys when adding features
- Translations are handled via Weblate by the community
- Translation files: `public/locales/{lang}/*.json`

## Pre-commit Hooks

Husky runs on commit:

1. Prettier formatting
2. oxlint with auto-fix
3. Prisma format (for .prisma files)
4. Type checking with tsc

Override with `git commit --no-verify` if needed.

## Testing Harness Workflow

Keep the fast checks (`pnpm prettier --check .`, `pnpm lint`, `pnpm tsc --noEmit`,
`pnpm test`, and `pnpm build --no-lint`) independent from the disposable database and
browser jobs. CI runs PostgreSQL integration tests with `pnpm test:integration` and Chromium
E2E tests with `pnpm exec playwright test --project=chromium` in separate jobs.

### Test Selection

- `pnpm test` selects `src/**/*.{test,spec}.{ts,tsx}` and excludes `src/tests/integration/`.
- `pnpm test:integration` selects only `src/tests/integration/**/*.{test,spec}.{ts,tsx}`.
- `pnpm exec playwright test --project=chromium` selects `tests/e2e/` through
  `playwright.config.ts`; each test receives an isolated authenticated scenario.
- Run one Jest file with `pnpm test src/tests/simplify.test.ts`, one integration file with
  `pnpm test:integration src/tests/integration/expense.integration.test.ts`, or one browser
  file with `pnpm exec playwright test tests/e2e/group-expense.spec.ts`.

### Database Safety

Integration and E2E databases must be local/disposable and end in `_test`. The integration
harness refuses non-local or non-test URLs; never point these commands at development,
staging, or production data. Prepare integration databases with `pnpm test:db:up` and browser
databases with `pnpm test:e2e:db:up`; the shared launcher deploys migrations and configures
pg_cron in native Nix PostgreSQL or Docker. Set `TEST_DATABASE_URL` and `E2E_DATABASE_URL`
to distinct ports/clusters per suite and worktree. Stop them with the corresponding `:down`
commands. Test database selection never falls back to application `DATABASE_URL`.

See `docs/testing-strategy.md` for the complete command matrix and agent workflow.

<!-- context7 -->

Use the `ctx7` CLI to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service -- even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer -- your training data may not reflect recent changes. Prefer this over web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

## Steps

1. Resolve library: `npx ctx7@latest library <name> "<user's question>"` — use the official library name with proper punctuation (e.g., "Next.js" not "nextjs", "Customer.io" not "customerio", "Three.js" not "threejs")
2. Pick the best match (ID format: `/org/project`) by: exact name match, description relevance, code snippet count, source reputation (High/Medium preferred), and benchmark score (higher is better). If results don't look right, try alternate names or queries (e.g., "next.js" not "nextjs", or rephrase the question)
3. Fetch docs: `npx ctx7@latest docs <libraryId> "<user's question>"`
4. Answer using the fetched documentation

You MUST call `library` first to get a valid ID unless the user provides one directly in `/org/project` format. Use the user's full question as the query -- specific and detailed queries return better results than vague single words. Do not run more than 3 commands per question. Do not include sensitive information (API keys, passwords, credentials) in queries.

For version-specific docs, use `/org/project/version` from the `library` output (e.g., `/vercel/next.js/v14.3.0`).

If a command fails with a quota error, inform the user and suggest `npx ctx7@latest login` or setting `CONTEXT7_API_KEY` env var for higher limits. Do not silently fall back to training data.

<!-- context7 -->

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command from this file's directory: npx @next/codemod agents-md --output AGENTS.md|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,03-layouts-and-pages.mdx,04-linking-and-navigating.mdx,05-server-and-client-components.mdx,06-partial-prerendering.mdx,07-fetching-data.mdx,08-updating-data.mdx,09-caching-and-revalidating.mdx,10-error-handling.mdx,11-css.mdx,12-images.mdx,13-fonts.mdx,14-metadata-and-og-images.mdx,15-route-handlers-and-middleware.mdx,16-deploying.mdx,17-upgrading.mdx}|01-app/02-guides:{analytics.mdx,authentication.mdx,backend-for-frontend.mdx,caching.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,data-security.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,json-ld.mdx,lazy-loading.mdx,local-development.mdx,mdx.mdx,memory-usage.mdx,multi-tenant.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,prefetching.mdx,production-checklist.mdx,progressive-web-apps.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,single-page-applications.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx,videos.mdx}|01-app/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|01-app/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|01-app/02-guides/upgrading:{codemods.mdx,version-14.mdx,version-15.mdx}|01-app/03-api-reference:{07-edge.mdx,08-turbopack.mdx}|01-app/03-api-reference/01-directives:{use-cache.mdx,use-client.mdx,use-server.mdx}|01-app/03-api-reference/02-components:{font.mdx,form.mdx,image.mdx,link.mdx,script.mdx}|01-app/03-api-reference/03-file-conventions/01-metadata:{app-icons.mdx,manifest.mdx,opengraph-image.mdx,robots.mdx,sitemap.mdx}|01-app/03-api-reference/03-file-conventions:{default.mdx,dynamic-routes.mdx,error.mdx,forbidden.mdx,instrumentation-client.mdx,instrumentation.mdx,intercepting-routes.mdx,layout.mdx,loading.mdx,mdx-components.mdx,middleware.mdx,not-found.mdx,page.mdx,parallel-routes.mdx,public-folder.mdx,route-groups.mdx,route-segment-config.mdx,route.mdx,src-folder.mdx,template.mdx,unauthorized.mdx}|01-app/03-api-reference/04-functions:{after.mdx,cacheLife.mdx,cacheTag.mdx,connection.mdx,cookies.mdx,draft-mode.mdx,fetch.mdx,forbidden.mdx,generate-image-metadata.mdx,generate-metadata.mdx,generate-sitemaps.mdx,generate-static-params.mdx,generate-viewport.mdx,headers.mdx,image-response.mdx,next-request.mdx,next-response.mdx,not-found.mdx,permanentRedirect.mdx,redirect.mdx,revalidatePath.mdx,revalidateTag.mdx,unauthorized.mdx,unstable_cache.mdx,unstable_noStore.mdx,unstable_rethrow.mdx,use-link-status.mdx,use-params.mdx,use-pathname.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,use-selected-layout-segment.mdx,use-selected-layout-segments.mdx,userAgent.mdx}|01-app/03-api-reference/05-config/01-next-config-js:{allowedDevOrigins.mdx,appDir.mdx,assetPrefix.mdx,authInterrupts.mdx,basePath.mdx,browserDebugInfoInTerminal.mdx,cacheComponents.mdx,cacheLife.mdx,compress.mdx,crossOrigin.mdx,cssChunking.mdx,devIndicators.mdx,distDir.mdx,env.mdx,eslint.mdx,expireTime.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,htmlLimitedBots.mdx,httpAgentOptions.mdx,images.mdx,incrementalCacheHandlerPath.mdx,inlineCss.mdx,logging.mdx,mdxRs.mdx,middlewareClientMaxBodySize.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,ppr.mdx,productionBrowserSourceMaps.mdx,reactCompiler.mdx,reactMaxHeadersLength.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,sassOptions.mdx,serverActions.mdx,serverComponentsHmrCache.mdx,serverExternalPackages.mdx,staleTimes.mdx,staticGeneration.mdx,taint.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,turbopackPersistentCaching.mdx,typedRoutes.mdx,typescript.mdx,urlImports.mdx,useCache.mdx,useLightningcss.mdx,viewTransition.mdx,webVitalsAttribution.mdx,webpack.mdx}|01-app/03-api-reference/05-config:{02-typescript.mdx,03-eslint.mdx}|01-app/03-api-reference/06-cli:{create-next-app.mdx,next.mdx}|02-pages/01-getting-started:{01-installation.mdx,02-project-structure.mdx,04-images.mdx,05-fonts.mdx,06-css.mdx,11-deploying.mdx}|02-pages/02-guides:{amp.mdx,analytics.mdx,authentication.mdx,babel.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,lazy-loading.mdx,mdx.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,post-css.mdx,preview-mode.mdx,production-checklist.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx}|02-pages/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|02-pages/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|02-pages/02-guides/upgrading:{codemods.mdx,version-10.mdx,version-11.mdx,version-12.mdx,version-13.mdx,version-14.mdx,version-9.mdx}|02-pages/03-building-your-application/01-routing:{01-pages-and-layouts.mdx,02-dynamic-routes.mdx,03-linking-and-navigating.mdx,05-custom-app.mdx,06-custom-document.mdx,07-api-routes.mdx,08-custom-error.mdx}|02-pages/03-building-your-application/02-rendering:{01-server-side-rendering.mdx,02-static-site-generation.mdx,04-automatic-static-optimization.mdx,05-client-side-rendering.mdx}|02-pages/03-building-your-application/03-data-fetching:{01-get-static-props.mdx,02-get-static-paths.mdx,03-forms-and-mutations.mdx,03-get-server-side-props.mdx,05-client-side.mdx}|02-pages/03-building-your-application/06-configuring:{12-error-handling.mdx}|02-pages/04-api-reference:{06-edge.mdx,08-turbopack.mdx}|02-pages/04-api-reference/01-components:{font.mdx,form.mdx,head.mdx,image-legacy.mdx,image.mdx,link.mdx,script.mdx}|02-pages/04-api-reference/02-file-conventions:{instrumentation.mdx,middleware.mdx,public-folder.mdx,src-folder.mdx}|02-pages/04-api-reference/03-functions:{get-initial-props.mdx,get-server-side-props.mdx,get-static-paths.mdx,get-static-props.mdx,next-request.mdx,next-response.mdx,use-amp.mdx,use-report-web-vitals.mdx,use-router.mdx,userAgent.mdx}|02-pages/04-api-reference/04-config/01-next-config-js:{allowedDevOrigins.mdx,assetPrefix.mdx,basePath.mdx,bundlePagesRouterDependencies.mdx,compress.mdx,crossOrigin.mdx,devIndicators.mdx,distDir.mdx,env.mdx,eslint.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,httpAgentOptions.mdx,images.mdx,middlewareClientMaxBodySize.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,runtime-configuration.mdx,serverExternalPackages.mdx,trailingSlash.mdx,transpilePackages.mdx,turbo.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,webVitalsAttribution.mdx,webpack.mdx}|02-pages/04-api-reference/04-config:{01-typescript.mdx,02-eslint.mdx}|02-pages/04-api-reference/05-cli:{create-next-app.mdx,next.mdx}|03-architecture:{accessibility.mdx,fast-refresh.mdx,nextjs-compiler.mdx,supported-browsers.mdx}|04-community:{01-contribution-guide.mdx,02-rspack.mdx}<!-- NEXT-AGENTS-MD-END -->
