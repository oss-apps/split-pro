/** @jest-environment jsdom */

import { screen } from '@testing-library/react';

import { FriendBalance } from '~/components/Friend/FriendBalance';
import { testI18n } from '~/tests/helpers/i18n';
import { renderWithProviders } from '~/tests/helpers/render';
import { createTestUser } from '~/tests/helpers/user';

describe('balance label layout', () => {
  it.each([
    [1000n, 'you_lent'],
    [-1000n, 'you_owe'],
  ] as const)('keeps the translated %s label before the amount', (amount, key) => {
    const original = testI18n.getResource('en', 'common', `ui.expense.statements.${key}`) as string;
    testI18n.addResource('en', 'common', `ui.expense.statements.${key}`, 'Translated label');
    try {
      renderWithProviders(
        <FriendBalance
          user={createTestUser()}
          balance={{ currency: 'EUR', amount, friendId: 2, groupId: null }}
        />,
      );
      const label = screen.getByText('Translated label');
      expect(label.nextElementSibling).toHaveTextContent('10');
      expect(label.parentElement?.children).toHaveLength(2);
    } finally {
      testI18n.addResource('en', 'common', `ui.expense.statements.${key}`, original);
    }
  });
});
