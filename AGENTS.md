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
pnpm tsgo --noEmit           # Type check (used in pre-commit)
```

### Building

```bash
pnpm build         # Build for production
```

### CI Pipeline (runs on PRs)

1. `pnpm prettier --check .` - Format check
2. `pnpm lint` - Linting
3. `pnpm tsgo --noEmit` - Type checking
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
- `useCallback` for memoized callbacks, `useMemo` for computed values
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

## Localization

- Only create English translation keys when adding features
- Translations are handled via Weblate by the community
- Translation files: `public/locales/{lang}/*.json`

## Pre-commit Hooks

Husky runs on commit:

1. Prettier formatting
2. oxlint with auto-fix
3. Prisma format (for .prisma files)
4. Type checking with tsgo

Override with `git commit --no-verify` if needed.
