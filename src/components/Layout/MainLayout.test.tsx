/** @jest-environment jsdom */

import { screen } from '@testing-library/react';
import React from 'react';

import { renderWithProviders } from '~/tests/helpers/render';
import { createMockRouter } from '~/tests/helpers/router';
import MainLayout from './MainLayout';

it('marks the active navigation section for nested routes', () => {
  renderWithProviders(
    <MainLayout title="Overview">
      <p>Content</p>
    </MainLayout>,
    {
      router: createMockRouter({ pathname: '/groups/[groupId]', asPath: '/groups/7' }),
    },
  );
  expect(screen.getByText('Content')).toBeInTheDocument();
  screen.getAllByRole('link', { name: 'Groups' }).forEach((link) => {
    expect(link).toHaveAttribute('href', '/groups');
    expect(link.querySelector('span')).toHaveClass('text-cyan-500');
  });
  screen.getAllByRole('link', { name: 'Balances' }).forEach((link) => {
    expect(link.querySelector('span')).not.toHaveClass('text-cyan-500');
  });
});
