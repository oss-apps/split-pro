# Issue #206: Delete own account

Source: https://github.com/oss-apps/split-pro/issues/206

Follow the discussion's accepted approach: clear account identity and credentials,
retain the user row for shared financial history, and transfer group ownership to
another member. The later hybrid hard-deletion suggestion is outside this first
implementation. The issue now explicitly covers self-hosted instances.

## Intended behavior

- Add self-service deletion to the account page with explicit confirmation.
- Display the retained identity as “Deleted user”; clear email rather than using
  a shared fake address, since User.email is nullable and unique. Re-registering
  with the original email creates a separate user with no historical access.
- Preserve expenses, participants, notes, group memberships, and balances.
  Outstanding balances do not block anonymization; explain this in confirmation.
- Transfer each owned group to a randomly selected non-deleted member. If none
  exists, retain the tombstone owner and preserve the group and its history.
- Do not add an administrator deletion interface: the project has no user-role
  model, and the issue's principal request is deletion of one's own account.

## Implementation

1. **Represent deleted accounts explicitly.** Add nullable User.deletedAt and a
   database migration. Use this marker to distinguish deleted accounts from
   unverified invite placeholders. Centralize the deleted-user label and use it
   in existing display helpers; create English translation keys only.

2. **Implement a transactional deletion service.** Add a service under
   src/server/api/services and a protected user.deleteAccount mutation in
   src/server/api/routers/user.ts. Derive the target exclusively from the current
   session. Atomically mark deletion, clear name/image/email/emailVerified,
   banking identifiers and preferences, remove OAuth accounts, all sessions,
   verification tokens for the former email, cached bank data, push subscriptions,
   and obsolete personal default-split settings. Reset hiddenFriendIds. Transfer
   group ownership within the transaction, excluding deleted members. Preserve
   monetary records and shared group configuration. Ensure repeated requests and
   concurrent ownership/deletion changes cannot leave a partially deleted account.

3. **Close authentication and mutation paths.** Review src/server/auth.ts and
   src/server/api/trpc.ts so deleted identities cannot authenticate or continue
   operating with a previously loaded session. Cover already-issued email tokens
   and OAuth relinking. Review invite/member selection and profile-update paths
   to prevent reactivating a tombstone. Preserve historical detail views.

4. **Handle integrations and automation deliberately.** Inventory recurring jobs
   referencing the deleted account; stop future schedules initiated by it while
   retaining existing expenses and other users' schedules. Use existing bank
   disconnect mechanisms where available; external cleanup must not hold a DB
   transaction open. Check avatar storage ownership before deleting an object;
   retain shared receipts. Do not promise removal of personal information embedded
   in shared descriptions, receipts, or notes.

5. **Build the account-page flow.** Update src/pages/account.tsx and add a
   confirmation component using the existing dialog conventions. Explain retained
   history and balances, ownership transfer, permanent sign-out, and the existing
   data-export option. Require explicit confirmation, disable duplicate submission,
   display translated failures, and sign out and clear client caches after success.

6. **Verify behavior.** Add database integration coverage for identity cleanup,
   preserved expenses and exact BigInt balances, ownership transfer including
   archived and sole-member groups, multiple deleted members, rollback,
   authorization, token/session invalidation, and registration with the original
   email. Add browser coverage for cancellation, confirmation, sign-out, and a
   second user's view of unchanged history under the deleted-user label.

## Validation and environment

- Worktree: .worktrees/issue-206; branch: feat/issue-206-delete-account.
- Local .env copied and isolated: app port 3206, PostgreSQL port 55206,
  database splitpro_issue_206, container splitpro-issue-206.
- Planning does not require starting PostgreSQL or installing dependencies.
  Before implementation verification, provision the dedicated development DB
  using the repository worktree instructions and initialize pg_cron/schema/seed.
- Integration and E2E suites must use separate local disposable databases ending
  in \_test, on distinct ports, with explicit TEST_DATABASE_URL/E2E_DATABASE_URL.
- Run formatting, lint, type checking, unit tests, and production build independently
  of the database/browser suites, then targeted integration and Chromium E2E tests.
- During implementation, fetch current library documentation before relying on
  Prisma, NextAuth, tRPC, or UI-library API details.
