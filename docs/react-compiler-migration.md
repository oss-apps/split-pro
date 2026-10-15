# React Compiler migration

Next.js enables the stable Babel React Compiler through `reactCompiler: true` in
`next.config.js`. The installed plugin is `babel-plugin-react-compiler` 1.0.0, targeting
the built-in React 19 compiler runtime. Turbopack remains the production bundler.

## Correctness before simplification

The migration first fixes hook ordering, session immutability, render-time ref reads,
memoization dependencies, and effect-driven derived state. React Hook Form subscriptions
use `useWatch` rather than render-time `watch()` calls. Hydration and PWA detection use
external-store snapshots with matching server output.

Performance-driven handler factories and manual memoization are simplified only after
lint, formatting, types, unit tests, production build, and relevant browser scenarios pass.
Only simplify components confirmed to be compiled; passing lint alone does not establish
that the build compiler optimized a function.

## Verified compilation and current limitations

The annotation-mode language-selector pilot produced a `CompileSuccess` event and an
import from `react/compiler-runtime`. An inference-mode audit also confirmed compilation
of the group/account forms, app/session wrappers, currency-helper provider, expense-list
shell, and hydration/PWA hooks.

The stable Babel plugin currently emits `CompileError` hints with the reason
`(BuildHIR::lowerExpression) Handle BigIntLiteral expressions` for functions containing
BigInt literals. The inspected examples include:

- `AddOrEditExpensePage` in `AddExpensePage.tsx`.
- `SplitSection`, `ParticipantRow`, and `UserAndAmount` in `SplitTypeSection.tsx`.
- `CurrencyConversion` in `Friend/CurrencyConversion.tsx`.
- `SettleUpWithBalances` in `Friend/Settleup.tsx`.
- The ordinary expense-row component in `Expense/ExpenseList.tsx`.

These functions retain their existing manual memoization and run normally without compiler
optimization. This is an automatic compiler fallback, not a correctness-rule suppression.
Do not change monetary values to floating-point numbers or rewrite BigInt arithmetic to
make the compiler accept them. Re-audit these functions when upgrading the compiler.

## Lint warning ratchet

`pnpm lint` runs Oxlint and checks `.oxlint-baseline.json`. Errors always fail. Existing
warning debt is budgeted by the full diagnostic rule code and repository-relative file.
New rule/file combinations or increased warning counts fail; decreases are reported so
the baseline can be reduced explicitly. Normal lint runs never update the baseline.

Use `pnpm lint:raw` for the complete underlying Oxlint diagnostic output. Broad style,
performance, and suspicious categories are disabled in favor of explicitly selected rules,
while correctness and type-aware checking remain enabled. The baseline is accepted debt,
not a claim that every warning is harmless.

## Verification

Run the fast checks independently of disposable database tests:

```bash
pnpm prettier --check .
pnpm lint
pnpm tsc --noEmit
pnpm test
pnpm build
```

To exercise compiler-transformed production UI against a disposable browser database:

```bash
pnpm test:e2e:db:up
E2E_SERVER_MODE=production pnpm test:e2e --project=chromium
pnpm test:e2e:db:down
```

Production browser mode uses the already-built application and the same isolated test
scenarios as development mode. Rebuild after application changes before running it.
The default remains development mode. The dependency-update-era development run currently
fails on missing icon-module factories; production mode passes the existing scenarios.
That development regression remains a separate issue and is not attributed to this migration.
