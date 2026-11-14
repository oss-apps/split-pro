/** @jest-environment jsdom */

import type { BalanceView } from '@prisma/client';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { renderWithProviders } from '~/tests/helpers/render';
import { createTestUser } from '~/tests/helpers/user';

const mutate = jest.fn();
const invalidate = jest.fn().mockResolvedValue(undefined);

jest.mock('~/utils/api', () => ({
  api: {
    user: { me: { useQuery: () => ({ data: { id: 1 } }) } },
    expense: {
      addOrEditCurrencyConversion: { useMutation: () => ({}) },
      addOrEditExpense: { useMutation: () => ({ mutate }) },
    },
    useUtils: () => ({ user: { invalidate }, group: { invalidate }, expense: { invalidate } }),
  },
}));

import { BalanceList } from './BalanceList';

const users = [
  createTestUser(),
  createTestUser({ id: 2, name: 'Luca' }),
  createTestUser({ id: 3, name: 'Sam' }),
];
const balance = (friendId: number, amount: bigint): BalanceView => ({
  userId: 1,
  friendId,
  amount,
  currency: 'EUR',
  groupId: 7,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('BalanceList', () => {
  it('disables empty member accordions', () => {
    renderWithProviders(<BalanceList groupId={7} users={users} />);
    screen.getAllByRole('button', { name: /settled up/ }).forEach((trigger) => {
      expect(trigger).toBeDisabled();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('opens a transfer from a disabled member row without expanding it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BalanceList groupId={7} users={users} />);
    const accordion = screen.getByRole('button', { name: /Luca is settled up/ });
    await user.click(screen.getByRole('button', { name: 'Record transfer with Luca' }));
    expect(await screen.findByText('You pay Luca')).toBeVisible();
    expect(accordion).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Transfer amount' }));
    await user.type(screen.getByRole('textbox', { name: 'Transfer amount' }), '5.00');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        paidBy: 1,
        groupId: 7,
        amount: 500n,
        participants: [
          { userId: 1, amount: 500n },
          { userId: 2, amount: -500n },
        ],
      }),
      expect.anything(),
    );
  });

  it('disables transfers in archived groups', () => {
    renderWithProviders(<BalanceList groupId={7} users={users} isArchived />);
    expect(screen.getByRole('button', { name: 'Record transfer with Luca' })).toBeDisabled();
  });

  it('keeps details available when debts cancel out in the total', () => {
    renderWithProviders(
      <BalanceList
        groupId={7}
        users={users}
        groupBalances={[balance(2, 1000n), balance(3, -1000n)]}
      />,
    );
    expect(screen.getByRole('button', { name: /You are settled up/ })).toBeEnabled();
  });

  it('disables details when entries cancel out for the same member and currency', () => {
    renderWithProviders(
      <BalanceList
        groupId={7}
        users={users}
        groupBalances={[balance(2, 1000n), balance(2, -1000n)]}
      />,
    );
    expect(screen.getByRole('button', { name: /You are settled up/ })).toBeDisabled();
  });
});
