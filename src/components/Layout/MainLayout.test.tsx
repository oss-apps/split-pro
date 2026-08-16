import { screen } from '@testing-library/react';
import React from 'react';

import { renderWithProviders } from '~/tests/helpers/render';
import { createMockRouter } from '~/tests/helpers/router';
import { resetStores } from '~/tests/helpers/resetStores';

const mockRouter = createMockRouter({ pathname: '/groups/7' });
jest.mock('next/router', () => ({ useRouter: () => mockRouter }));
jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'meta.application_name': 'SplitPro',
        'navigation.balances': 'Balances',
        'navigation.groups': 'Groups',
        'navigation.add_expense': 'Add Expense',
        'navigation.add': 'Add',
        'navigation.activity': 'Activity',
        'navigation.account': 'Account',
      })[key] ?? key,
    ready: true,
    i18n: { language: 'en' },
  }),
}));

const { default: MainLayout } = require('./MainLayout') as typeof import('./MainLayout');

it('renders navigation links and marks the active section', () => {
  renderWithProviders(
    <MainLayout title="Overview">
      <p>Content</p>
    </MainLayout>,
  );

  expect(screen.getAllByRole('link', { name: 'Groups' }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('link', { name: 'Balances' }).length).toBeGreaterThan(0);
  expect(screen.getByText('Content')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Groups' })[0]).toHaveAttribute('href', '/groups');
});

afterEach(resetStores);
