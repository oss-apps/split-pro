import { createApiTRPCRouter } from './apiTrpc';
import {
  addOrEditExpenseApiProcedure,
  expenseMethods,
  getAllExpensesApiProcedure,
  getExpensesWithFriendApiProcedure,
  getGroupExpensesApiProcedure,
} from './routers/expense';
import { groupMethods } from './routers/group';
import { getOwnExpensesApiProcedure, userMethods } from './routers/user';

/**
 * Pick a subset of a router's method record while preserving the exact
 * procedure types (needed for the static OpenAPI generation below).
 *
 * Note: the picked records are assigned to intermediate constants. Spreading
 * the call directly into the object literal passed to `createApiTRPCRouter`
 * makes TypeScript widen the picked keys via the call's contextual type,
 * re-exposing every method of the source record.
 */
const pickMethods = <T extends Record<string, unknown>, K extends keyof T>(
  methods: T,
  keys: readonly K[],
): Pick<T, K> => Object.fromEntries(keys.map((key) => [key, methods[key]])) as Pick<T, K>;

const userApiMethods = pickMethods(userMethods, [
  'me',
  'getFriends',
  'getBalancesWithFriend',
  'getFriend',
]);

const groupApiMethods = pickMethods(groupMethods, ['getAllGroups', 'getGroupDetails']);

const expenseApiMethods = pickMethods(expenseMethods, ['getBalances', 'getExpenseDetails']);

/**
 * Public REST API surface, served at `/api/v1` with API-key auth and documented
 * by the generated OpenAPI spec (`scripts/generate-openapi.ts`).
 *
 * Procedures are shared with the app routers via their exported method records
 * (see `userMethods` & co.), so each procedure exists exactly once. API-only
 * variants (pagination, plain-JSON friendly input schemas) are defined next to
 * their app counterparts in the router files. `@trpc/openapi` has no
 * per-procedure filter, so exposure is controlled structurally by what is
 * mounted here. Add new public endpoints one at a time.
 */
export const apiRouter = createApiTRPCRouter({
  user: createApiTRPCRouter({
    ...userApiMethods,
    getOwnExpenses: getOwnExpensesApiProcedure,
  }),
  group: createApiTRPCRouter(groupApiMethods),
  expense: createApiTRPCRouter({
    ...expenseApiMethods,
    getAllExpenses: getAllExpensesApiProcedure,
    getExpensesWithFriend: getExpensesWithFriendApiProcedure,
    getGroupExpenses: getGroupExpensesApiProcedure,
    addOrEditExpense: addOrEditExpenseApiProcedure,
  }),
});

export type ApiRouter = typeof apiRouter;
