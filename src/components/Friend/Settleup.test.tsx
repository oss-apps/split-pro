import { SplitType } from '@prisma/client';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { renderWithProviders } from '~/tests/helpers/render';
import { resetStores } from '~/tests/helpers/resetStores';
import type { MinimalBalance } from '~/types/balance.types';

const mutate = jest.fn();
const invalidate = jest.fn().mockResolvedValue(undefined);

jest.mock('~/utils/api', () => ({
  api: {
    expense: { addOrEditExpense: { useMutation: () => ({ mutate }) } },
    useUtils: () => ({ user: { invalidate }, expense: { invalidate } }),
  },
}));
jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: React.PropsWithChildren) => children,
  useSession: () => ({
    data: { user: { id: 1, name: 'Alex Example', email: 'alex@example.com', image: null } },
    status: 'authenticated',
  }),
}));
jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'actions.save': 'Save',
        'actions.settle_up': 'Settle up',
        'ui.settle_up_name': 'Settlement',
        'ui.select_balance': 'Select balance',
        'actors.you': 'You',
        'ui.expense.you.pay': 'pay',
        'ui.expense.user.pay': 'pays',
      })[key] ?? key,
    i18n: { language: 'en' },
  }),
}));

const { SettleUp } = require('./Settleup') as typeof import('./Settleup');

const friend = { id: 2, name: 'Sam Friend', email: 'sam@example.com', image: null } as never;
const balance = {
  currency: 'USD',
  amount: -1250n,
  friendId: 2,
  groupId: 7,
  groupName: 'Trip',
} satisfies MinimalBalance;

describe('SettleUp', () => {
  afterEach(resetStores);

  beforeEach(() => mutate.mockClear());

  it('submits a settlement with the correct BigInt direction', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SettleUp friend={friend} balances={[balance]}>
        <button>Settle up</button>
      </SettleUp>,
    );

    await user.click(screen.getByRole('button', { name: 'Settle up' }));
    await user.click(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mutate.mock.calls[0]?.[0]).toMatchObject({
      amount: 1250n,
      splitType: SplitType.SETTLEMENT,
      paidBy: 1,
      groupId: 7,
      participants: [
        { userId: 1, amount: 1250n },
        { userId: 2, amount: -1250n },
      ],
    });
  });
});
