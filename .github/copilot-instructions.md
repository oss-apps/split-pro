# SplitPro AI Coding Agent Instructions

## Architecture Overview

SplitPro is a **Next.js PWA** expense-splitting app (Splitwise alternative). Core architecture:

- **Frontend**: Next.js 15, React 19, Tailwind + ShadcnUI, Zustand for state
- **Backend**: tRPC routers with Prisma ORM, NextAuth for auth
- **Database**: PostgreSQL with BigInt for numerical precision
- **Key Services**: `src/server/api/services/splitService.ts` (core business logic)

## Critical Design Principles

### 1. **BigInt for All Financial Values**
- **All amounts are stored and computed as `BigInt`, never floats** to prevent rounding errors
- When displaying: convert via `toUIString()` (divides by 100 for cents)
- When receiving input: convert via `toSafeBigInt()` (multiplies by 100)
- `BigMath` utility provides safe arithmetic operations
- Read: `README.md` FAQ and `jest.config.ts` for BigInt JSON serialization

### 2. **Double-Entry Balance Accounting**
Every expense creates **two balance records** (bidirectional):
```typescript
// User A pays $100, User B owes $50:
Balance: A -> B: -50 (A is owed)
Balance: B -> A: +50 (B owes)
```
- For **groups**: `GroupBalance` tracks intra-group debts separately
- Always update both directions when modifying expenses
- See: `src/server/api/services/splitService.ts` (`createExpense`, `editExpense`)

### 3. **Transaction Batching with Prisma**
- Use `db.$transaction(operations)` for expense mutations to ensure atomicity
- Common pattern: collect `operations` array, execute once
- Example: `createExpense()` batches 10-15 upserts in single transaction

### 4. **Split Types**
From `@prisma/client` SplitType enum: `EQUAL`, `PERCENTAGE`, `SHARE`, `EXACT`, `ADJUSTMENT`, `SETTLEMENT`, `CURRENCY_CONVERSION`
- Each split type has unique calculation logic in `addStore.ts`, except `SETTLEMENT` and `CURRENCY_CONVERSION` which are handled specially
- Use `calculateParticipantSplit()` to compute amounts based on type

## File Structure & Key Patterns

| Path | Purpose |
|------|---------|
| `src/server/api/services/splitService.ts` | Core: expense CRUD, balance updates |
| `src/server/api/routers/` | tRPC endpoints (expense, group, user, bankTransactions) |
| `src/store/addStore.ts` | Client-side form state + split calculations (Zustand) |
| `src/components/AddExpense/` | Form UI for adding/editing expenses |
| `src/lib/category.ts` | Expense categories (food, travel, etc.) |
| `src/lib/currency.ts` | Currency utilities and conversion |
| `prisma/schema.prisma` | Data model (2 schemas: `public`, `cron`) |

## Common Workflows

### Adding/Editing Expenses
1. Collect input in `addStore.ts` (amounts, participants, split type)
2. Call `expenseRouter.addOrEditExpense` tRPC endpoint
3. Endpoint validates with `createExpenseSchema` and calls `splitService.createExpense()` or `editExpense()`
4. Service batches balance upserts + sends push notifications

### Deleting Expenses
- Call `deleteExpense()` → reverses all balances (negates participant amounts)
- Soft-deletes: sets `deletedAt` timestamp, expenses remain visible in history

### Recalculating Balances
- Call `recalculateGroupBalances(groupId)` to rebuild group debts from scratch
- Used after imports or data repairs
- Resets all group balances to 0, then replays all non-deleted expenses

## Testing & Build

**Use `pnpm` (not npm)** - this project uses pnpm for dependency management.

```bash
pnpm install          # Install dependencies
pnpm dev              # Next.js + turbopack dev server
pnpm dx               # Full setup: install, docker up, migrations
pnpm test             # Jest (BigInt.prototype.toJSON already defined)
pnpm test:watch       # Jest in watch mode
pnpm lint             # oxlint with type checking
pnpm build            # Production build (no lint)
pnpm db:push          # Sync schema changes to DB
pnpm db:studio        # Open Prisma Studio GUI
pnpm db:seed          # Seed database with dummy data
```

**Pre-commit hooks** (Husky): prettier + oxlint auto-fixes. Override with `git commit --no-verify`.

## Data Flow Specifics

### User Balance → Friend Balance
```
Balance(userId, currency, friendId)
- userId owes/is-owed by friendId
- amount > 0: userId is owed (friend owes userId)
- amount < 0: userId owes (userId owes friend)
```

### Group Balance → Group Friend Balance
```
GroupBalance(groupId, currency, userId, firendId)  // note: typo "firendId"
- Within a specific group, userId's balance with firendId
- Isolated from general friend balances
```

## Integration Points

- **Authentication**: NextAuth + custom session enrichment (adds `user.currency`, `preferredLanguage`)
- **Storage**: S3/R2 for expense bills (`getDocumentUploadUrl` in `storage.ts`)
- **Bank Integration**: Plaid + GoCardless via `bankTransactionHelper.ts`
- **Notifications**: Push via `service-notification.ts`, additionally poll the database for missed notifications
- **Currency Rates**: Pluggable providers (Frankfurter, OXR, NBP) in `currencyRateService.ts`
- **i18n**: next-i18next with Weblate; always add English keys first, let community translate
- **Dates**: Use `date-fns` for formatting/parsing, store all dates in UTC


## Avoiding Common Pitfalls

1. **Don't use floats**: All amounts must be BigInt before DB
2. **Participant amounts must be non-zero** (filtered on create): `participants.filter(p => 0n !== p.amount)`
3. **Always update both balance directions** when modifying expenses
4. **Test transactions**: Use `db.$transaction()` so failures rollback all operations
5. **For new languages**: Add to config after community translates on Weblate
6. **Currency precision**: Some currencies have 0 decimals (JPY) or 3 (BHD)—handle in display/input
7. **Typo in schema**: `firendId` (not `friendId`) in GroupBalance—maintain for consistency

## tRPC API Endpoints

The backend uses **tRPC** for type-safe API communication. Routers are in `src/server/api/routers/`:

### `expenseRouter`
- `getBalances` (query) - Get user's balances with all friends/groups
- `addOrEditExpense` (mutation) - Create/update expense, handles split calculations
- `addOrEditCurrencyConversion` (mutation) - Convert between currencies
- `getExpenseDetails` (query) - Fetch full expense with participants
- `getGroupExpenseDetails` (query) - Get expenses within a group
- `getCurrencyRate` (query) - Fetch rate between two currencies
- `getAllExpenses` (query) - Get all expenses for current user
- `getRecurringExpenses` (query) - Get recurring expense jobs
- `deleteExpense` (mutation) - Soft-delete expense (sets deletedAt)

### `groupRouter`
- `create` (mutation) - Create new group
- `getAllGroups` (query) - Get all groups user belongs to
- `getAllGroupsWithBalances` (query) - Get groups with balances + recent expenses
- `getGroupDetails` (query) - Get detailed group info with members and expenses
- `getGroupTotals` (query) - Get totals per currency within group
- `updateGroupName` (mutation) - Rename group
- `addMember` (mutation) - Add user to group
- `removeMember` (mutation) - Remove user from group
- `simplifyDebts` (mutation) - Simplify group debts algorithmically
- `archiveGroup` (mutation) - Soft-delete group
- `leave` (mutation) - Current user leaves group
- `recalculateBalances` (mutation) - Rebuild all group balances

### `userRouter`
- `me` (query) - Get current authenticated user with preferences
- `getFriends` (query) - Get all friends (people user has balances with)
- `getOwnExpenses` (query) - Get expenses paid by current user
- `updateCurrency` (mutation) - Set user's default currency
- `getUserDetails` (query) - Get public user info (name, image)
- `importFromSplitwise` (mutation) - Import balances/groups from Splitwise
- `getImportProgress` (query) - Check Splitwise import status
- `downloadData` (mutation) - Export all user data as JSON
- `updateLanguage` (mutation) - Set user's preferred language
- `getWebPushPublicKey` (query) - Get VAPID key for push notifications

### `bankTransactionsRouter`
- `linkInstitution` (mutation) - Connect bank account (Plaid/GoCardless)
- `getInstitutions` (query) - List available banking integrations
- `exchangeToken` (mutation) - Exchange public token for access
- `getTransactions` (query) - Fetch and cache bank transactions
- `importTransaction` (mutation) - Create expense from bank transaction

## Component Architecture

**Large legacy components** exist (e.g., `AddExpensePage.tsx`, `SplitTypeSection.tsx`, `BalanceList.tsx`). These should be refactored incrementally into smaller, reusable pieces. **Multiple components per file are encouraged** to keep related logic co-located.

### Code Style
- Use **TypeScript** with strict types
- Use `as const` for fixed arrays/objects (e.g., categories, currencies)
- Use `React.FC<Props>` for component typing
- Use `satisfies` operator for fixed arrays/objects that somehow use other types
- Prefer code that is easy to read and self documenting over extensive comments

### Component Organization

**AddExpense flow** (`src/components/AddExpense/`):
- `AddExpensePage.tsx` - Main form container (becoming monolithic, candidate for splitting)
- `SplitTypeSection.tsx` - Handles split type selection + amount distribution
- `SelectUserOrGroup.tsx` - User/group picker with participant management
- `CategoryPicker.tsx`, `CurrencyPicker.tsx`, `DateSelector.tsx` - Reusable pickers
- `RecurrenceInput.tsx` - Cron expression builder
- `UploadFile.tsx` - Receipt/bill upload to S3/R2
- `UserInput.tsx` - Individual user participant with amount input

**Friend/Balance components** (`src/components/Friend/`):
- `FriendBalance.tsx` - Shows balance summary between two users
- `Settleup.tsx` - Create settlement expense for friend
- `GroupSettleup.tsx` - Settle up within a group
- `CurrencyConversion.tsx` - UI for currency conversion
- `Export.tsx` - Download friend transaction history

**Expense components** (`src/components/Expense/`):
- `ExpenseList.tsx` - Lists expenses with conditional rendering for types (settlement, currency conversion, regular)
- `BalanceList.tsx` - Displays group/friend balances in accordion
- `ExpenseDetails.tsx` - Full expense view with participants
- `DeleteExpense.tsx` - Confirmation + deletion logic
- `Receipt.tsx` - Render uploaded bill image

### Refactoring Guidelines

1. **Extract presentational components** - If a component has calculation logic + rendering, split into:
   - Container component (state, tRPC queries, logic)
   - Presentational component (UI only, receives props)

2. **Keep related components co-located** - Multiple small exports in one file is fine:
   ```typescript
   // Good: Related logic in one file
   export const CurrencyPicker = () => {...}
   export const CurrencyInput = () => {...}
   export const CurrencyDisplay = () => {...}
   ```

3. **Avoid deep nesting** - If JSX has 3+ levels of nesting, extract sub-components

4. **Use client components strategically** - Mark only interactive components with `'use client'`, let parents be server components when possible

## External References

- Numeric stability: `README.md` FAQ section
- Split logic details: `src/store/addStore.ts` `calculateParticipantSplit()`
- tRPC context: `src/server/api/trpc.ts` (context, procedures, middleware)
- Formatting: Prettier (100 char line, single quotes, tailwind class order)
- pnpm docs: https://pnpm.io/

## Copilot Instructions

Always use context7 when I need code generation, setup or configuration steps, or
library/API documentation. This means you should automatically use the Context7 MCP
tools to resolve library id and get library docs without me having to explicitly ask.
