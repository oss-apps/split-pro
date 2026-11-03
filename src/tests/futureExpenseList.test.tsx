/** @jest-environment jsdom */

import { act, fireEvent, screen } from '@testing-library/react';

import { ExpenseList } from '~/components/Expense/ExpenseList';
import { BalanceDateProvider } from '~/contexts/BalanceDateContext';
import { renderWithProviders } from '~/tests/helpers/render';
import { createTestUser } from '~/tests/helpers/user';

const mockInvalidate = jest.fn().mockResolvedValue(undefined);
const mockUtils = {
  expense: {
    getBalances: { invalidate: mockInvalidate },
    getCumulatedBalances: { invalidate: mockInvalidate },
  },
  user: { getBalancesWithFriend: { invalidate: mockInvalidate } },
  group: {
    getAllGroupsWithBalances: { invalidate: mockInvalidate },
    getGroupDetails: { invalidate: mockInvalidate },
  },
};

jest.mock('~/utils/api', () => ({ api: { useUtils: () => mockUtils } }));

const today = new Date(2026, 0, 2, 12);
const tomorrow = new Date(2026, 0, 3);
const expense = (expenseDate: Date, name = 'Tomorrow') => ({
  id: name,
  name,
  amount: 2000n,
  currency: 'USD',
  splitType: 'EQUAL' as const,
  category: 'Food',
  paidBy: 1,
  addedBy: 1,
  updatedBy: null,
  deletedBy: null,
  deletedAt: null,
  createdAt: today,
  updatedAt: today,
  expenseDate,
  fileKey: null,
  groupId: null,
  transactionId: null,
  recurrenceId: null,
  conversionToId: null,
  conversionTo: null,
  paidByUser: createTestUser(),
  deletedByUser: null,
  expenseParticipants: [
    { expenseId: name, userId: 1, amount: 1000n },
    { expenseId: name, userId: 2, amount: -1000n },
  ],
});

const renderList = (enabled: boolean) =>
  renderWithProviders(
    <BalanceDateProvider enabled={enabled}>
      <ExpenseList
        userId={1}
        contactId={2}
        expenses={[expense(tomorrow), expense(new Date(2026, 0, 2, 23, 59), 'Later today')]}
      />
    </BalanceDateProvider>,
  );

beforeEach(() => {
  jest.useFakeTimers({ now: today });
  mockInvalidate.mockClear();
});
afterEach(() => jest.useRealTimers());

describe('future expense presentation', () => {
  it('preserves styling and avoids rollover refreshes when disabled', async () => {
    renderList(false);
    expect(screen.queryByText('Upcoming expenses')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tomorrow/ })).not.toHaveClass('opacity-50');
    await act(async () => jest.advanceTimersByTime(24 * 60 * 60 * 1000));
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('grays out future dates with an explanation while keeping them clickable', () => {
    renderList(true);
    expect(screen.getByText('Upcoming expenses')).toBeVisible();
    const future = screen.getByRole('link', { name: /Tomorrow/ });
    expect(future).toHaveClass('opacity-50', 'grayscale');
    expect(future).toHaveAttribute('href', '/balances/2/expenses/Tomorrow');
    expect(future).toHaveAttribute('title', 'Future expense — not included in balances yet');
    expect(screen.getByRole('link', { name: /Later today/ })).not.toHaveClass('opacity-50');
    const label = screen.getByText('Upcoming expenses');
    expect(future.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(
      label.compareDocumentPosition(screen.getByRole('link', { name: /Later today/ })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  });

  it('shows one shared label for multiple upcoming expenses', () => {
    renderWithProviders(
      <BalanceDateProvider enabled>
        <ExpenseList
          userId={1}
          contactId={2}
          expenses={[expense(tomorrow), expense(new Date(2026, 0, 4), 'Next day')]}
        />
      </BalanceDateProvider>,
    );
    expect(screen.getAllByText('Upcoming expenses')).toHaveLength(1);
    expect(screen.getByText('Upcoming expenses')).toBeVisible();
  });

  it('removes future styling and refreshes every balance query at local midnight', async () => {
    renderList(true);
    await act(async () => jest.advanceTimersByTime(tomorrow.getTime() - today.getTime()));
    expect(screen.getByRole('link', { name: /Tomorrow/ })).not.toHaveClass('opacity-50');
    expect(screen.queryByText('Upcoming expenses')).not.toBeInTheDocument();
    expect(mockInvalidate).toHaveBeenCalledTimes(5);
  });

  it('catches up when a suspended tab regains focus on another day', () => {
    renderList(true);
    jest.setSystemTime(tomorrow);
    fireEvent.focus(window);
    expect(screen.getByRole('link', { name: /Tomorrow/ })).not.toHaveClass('opacity-50');
    expect(mockInvalidate).toHaveBeenCalledTimes(5);
  });
});
