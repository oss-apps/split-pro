import { createApiTRPCRouter } from './apiTrpc';
import { addOrEditExpenseApiProcedure, expenseMethods } from './routers/expense';
import { groupMethods } from './routers/group';
import { getOwnExpensesApiProcedure, userMethods } from './routers/user';

/**
 * Public REST API surface, served at `/api/v1` with API-key auth and documented
 * by the generated OpenAPI spec (`scripts/generate-openapi.ts`).
 *
 * Procedures are shared with the app routers via their exported method records
 * (see `userMethods` & co.), so each procedure exists exactly once. API-only
 * variants (plain-JSON friendly input schemas, pagination where the app loads
 * everything at once) are defined next to their app counterparts in the router
 * files. `@trpc/openapi` has no per-procedure filter, so exposure is controlled
 * structurally by what is mounted here. Add new public endpoints one at a time
 * and list them in `docs/API.md`.
 */
export const apiRouter = createApiTRPCRouter({
  user: createApiTRPCRouter({
    me: userMethods.me,
    getFriends: userMethods.getFriends,
    getOwnExpenses: getOwnExpensesApiProcedure,
    getBalancesWithFriend: userMethods.getBalancesWithFriend,
    getFriend: userMethods.getFriend,
  }),
  group: createApiTRPCRouter({
    getAllGroups: groupMethods.getAllGroups,
    getGroupDetails: groupMethods.getGroupDetails,
  }),
  expense: createApiTRPCRouter({
    getBalances: expenseMethods.getBalances,
    getAllExpenses: expenseMethods.getAllExpenses,
    getExpensesWithFriend: expenseMethods.getExpensesWithFriend,
    getGroupExpenses: expenseMethods.getGroupExpenses,
    getExpenseDetails: expenseMethods.getExpenseDetails,
    addOrEditExpense: addOrEditExpenseApiProcedure,
  }),
});

export type ApiRouter = typeof apiRouter;
