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
    useUtils: () => ({ user: { invalidate }, expense: { invalidate }, group: { invalidate } }),
  },
}));

import { SettleUp } from './Settleup';
import { GroupSettleUp } from './GroupSettleup';

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

describe('arbitrary transfers', () => {
  it.each([-1250n, 1250n])('reverses a friend settlement with balance %s', async (balance) => {
    const user = userEvent.setup();
    renderWithProviders(
      <SettleUp friend={friend} balances={[makeBalance(balance)]}>
        <button>Settle up</button>
      </SettleUp>,
    );
    await user.click(screen.getByRole('button', { name: 'Settle up' }));
    await user.click(await screen.findByRole('button', { name: 'Reverse direction' }));
    const input = screen.getByRole('textbox', { name: 'Transfer amount' });
    await user.clear(input);
    await user.type(input, '20.00');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const currentUserAmount = 0n > balance ? -2000n : 2000n;
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2000n,
        paidBy: 0n > balance ? 2 : 1,
        participants: [
          { userId: 1, amount: currentUserAmount },
          { userId: 2, amount: -currentUserAmount },
        ],
      }),
      expect.anything(),
    );
  });

  it('starts a transfer with no debt and requires a positive amount', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SettleUp friend={friend} balances={[]}>
        <button>Settle up</button>
      </SettleUp>,
    );
    await user.click(screen.getByRole('button', { name: 'Settle up' }));
    expect(await screen.findByRole('button', { name: 'Save' })).toBeDisabled();
    await user.clear(screen.getByRole('textbox', { name: 'Transfer amount' }));
    await user.type(screen.getByRole('textbox', { name: 'Transfer amount' }), '10.00');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1000n,
        paidBy: 1,
        groupId: null,
        splitType: SplitType.SETTLEMENT,
        participants: [
          { userId: 1, amount: 1000n },
          { userId: 2, amount: -1000n },
        ],
      }),
      expect.anything(),
    );
  });

  it('reverses a transfer with the selected group member without debt', async () => {
    const user = userEvent.setup();
    const other = createTestUser({ id: 3, name: 'Alex' });
    renderWithProviders(
      <GroupSettleUp user={createTestUser()} friend={other} amount={0n} currency="USD" groupId={7}>
        <button>Record transfer</button>
      </GroupSettleUp>,
    );
    await user.click(screen.getByRole('button', { name: 'Record transfer' }));
    expect(await screen.findByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reverse direction' })).toHaveTextContent('');
    await user.click(screen.getByRole('button', { name: 'Reverse direction' }));
    await user.clear(screen.getByRole('textbox', { name: 'Transfer amount' }));
    await user.type(screen.getByRole('textbox', { name: 'Transfer amount' }), '10.00');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1000n,
        paidBy: 3,
        groupId: 7,
        splitType: SplitType.SETTLEMENT,
        participants: [
          { userId: 3, amount: 1000n },
          { userId: 1, amount: -1000n },
        ],
      }),
      expect.anything(),
    );
  });
});
