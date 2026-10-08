/** @jest-environment jsdom */

import { SplitType } from '@prisma/client';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { renderWithProviders } from '~/tests/helpers/render';
import { createTestUser } from '~/tests/helpers/user';
import type { MinimalBalance } from '~/types/balance.types';

const mutate = jest.fn();
const invalidate = jest.fn().mockResolvedValue(undefined);
jest.mock('~/utils/api', () => ({
  api: {
    expense: { addOrEditExpense: { useMutation: () => ({ mutate }) } },
    useUtils: () => ({ user: { invalidate }, expense: { invalidate } }),
  },
}));

import { SettleUp } from './Settleup';

const friend = createTestUser({ id: 2, name: 'Sam Friend', email: 'sam@example.test' });
const makeBalance = (amount: bigint): MinimalBalance => ({
  currency: 'USD',
  amount,
  friendId: friend.id,
  groupId: 7,
  groupName: 'Trip',
});

describe('SettleUp', () => {
  it.each([
    { balance: -1250n, paidBy: 1, currentUserAmount: 1250n },
    { balance: 1250n, paidBy: 2, currentUserAmount: -1250n },
  ])('settles both directions: $balance', async ({ balance, paidBy, currentUserAmount }) => {
    const user = userEvent.setup();
    renderWithProviders(
      <SettleUp friend={friend} balances={[makeBalance(balance)]}>
        <button>Settle up</button>
      </SettleUp>,
    );
    await user.click(screen.getByRole('button', { name: 'Settle up' }));
    await user.click(await screen.findByRole('button', { name: 'Save' }));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1250n,
        currency: 'USD',
        splitType: SplitType.SETTLEMENT,
        paidBy,
        groupId: 7,
        participants: [
          { userId: 1, amount: currentUserAmount },
          { userId: 2, amount: -currentUserAmount },
        ],
      }),
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it('uses the edited amount for a partial settlement', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SettleUp friend={friend} balances={[makeBalance(-1250n)]}>
        <button>Settle up</button>
      </SettleUp>,
    );
    await user.click(screen.getByRole('button', { name: 'Settle up' }));
    const amount = await screen.findByRole('textbox');
    await user.clear(amount);
    await user.type(amount, '5.00');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 500n,
        participants: [
          { userId: 1, amount: 500n },
          { userId: 2, amount: -500n },
        ],
      }),
      expect.anything(),
    );
  });

  it('does not render an unauthenticated settlement action', () => {
    renderWithProviders(
      <SettleUp friend={friend} balances={[makeBalance(-1250n)]}>
        <button>Settle up</button>
      </SettleUp>,
      { session: null },
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
