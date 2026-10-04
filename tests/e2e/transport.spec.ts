import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

import type { AppRouter } from '~/server/api/root';
import { expect, expenseInput, test } from './fixtures';

test('round-trips BigInts and Dates through the authenticated Next.js tRPC endpoint', async ({
  page,
  baseURL,
  scenario,
}) => {
  const client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${baseURL}/api/trpc`,
        transformer: superjson,
        fetch: async (url, options) => {
          const requestUrl =
            'string' === typeof url ? url : url instanceof URL ? url.href : url.url;
          const response = await page.request.fetch(requestUrl, {
            method: options?.method,
            headers: { 'content-type': 'application/json' },
            data: options?.body,
          });
          return new Response(await response.text(), {
            status: response.status(),
            headers: { 'content-type': 'application/json' },
          });
        },
      }),
    ],
  });
  const expenseDate = new Date('2026-01-01T12:00:00Z');
  const [expense] = await client.expense.addOrEditExpense.mutate({
    ...expenseInput(scenario.owner.id, scenario.member.id, { groupId: scenario.group.id }),
    expenseDate,
  });
  expect(expense).toBeDefined();
  const details = await client.expense.getExpenseDetails.query({ expenseId: expense!.id });
  expect(details?.amount).toBe(2000n);
  expect(details?.expenseDate).toEqual(expenseDate);
});
