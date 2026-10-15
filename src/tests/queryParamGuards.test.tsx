/** @jest-environment jsdom */

import type { User } from 'next-auth';

import { renderWithProviders } from '~/tests/helpers/render';
import { createMockRouter } from '~/tests/helpers/router';
import ExpensesPage from '~/pages/expenses/[expenseId]';

const mockUseQuery = jest.fn((..._args: unknown[]) => ({ data: undefined, isPending: false }));

jest.mock('~/utils/api', () => ({
  api: {
    expense: {
      getExpenseDetails: { useQuery: (...args: unknown[]) => mockUseQuery(...args) },
    },
  },
}));
jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('next/head', () => ({ __esModule: true, default: () => null }));
jest.mock('~/components/Layout/MainLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('~/components/Expense/DeleteExpense', () => ({ DeleteExpense: () => null }));
jest.mock('~/components/Expense/ExpenseDetails', () => ({
  __esModule: true,
  default: () => null,
  EditCurrencyConversion: () => null,
  EditSettlement: () => null,
}));
jest.mock('~/components/SimpleConfirmationDialog', () => ({
  SimpleConfirmationDialog: () => null,
}));
jest.mock('~/utils/i18n/server', () => ({ customServerSideTranslations: jest.fn() }));

describe('expense detail query parameter guards', () => {
  const renderForQuery = (expenseId: string | string[] | undefined, isReady: boolean) => {
    const router = createMockRouter({ query: { expenseId } });
    router.isReady = isReady;
    mockUseQuery.mockClear();

    const user: User = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      image: '',
      currency: 'USD',
      preferredLanguage: 'en',
      hiddenFriendIds: [],
    };
    renderWithProviders(<ExpensesPage user={user} />, { router });

    return mockUseQuery.mock.calls[0];
  };

  it('disables the query until the router is ready, even when the id is scalar', () => {
    const call = renderForQuery('expense-1', false);

    expect(call?.[0]).toEqual({ expenseId: 'expense-1' });
    expect(call?.[1]).toEqual(expect.objectContaining({ enabled: false }));
  });

  it.each([undefined, '', ['expense-1', 'expense-2']])(
    'disables the query for missing, empty, or array route ids: %s',
    (expenseId) => {
      const call = renderForQuery(expenseId, true);

      expect(call?.[0]).toEqual({ expenseId: '' });
      expect(call?.[1]).toEqual(expect.objectContaining({ enabled: false }));
    },
  );

  it('enables the query with a valid scalar id', () => {
    const call = renderForQuery('expense-1', true);

    expect(call?.[0]).toEqual({ expenseId: 'expense-1' });
    expect(call?.[1]).toEqual(expect.objectContaining({ enabled: true }));
  });
});
