import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { renderWithProviders } from '~/tests/helpers/render';
import { resetStores } from '~/tests/helpers/resetStores';

const mutateAsync = jest.fn();
const refetch = jest.fn().mockResolvedValue(undefined);
const push = jest.fn().mockResolvedValue(true);

jest.mock('next/router', () => ({ useRouter: () => ({ push }) }));
jest.mock('~/utils/api', () => ({
  api: {
    group: { create: { useMutation: () => ({ mutateAsync }) } },
    useUtils: () => ({ group: { getAllGroupsWithBalances: { refetch } } }),
  },
}));
jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'actions.cancel': 'Cancel',
        'actions.submit': 'Submit',
        'errors.name_required': 'Name is required',
        'group_details.create_group.title': 'Create group',
        'group_details.create_group.group_name_placeholder': 'Group name',
      })[key] ?? key,
    ready: true,
    i18n: { language: 'en' },
  }),
}));

const { CreateGroup } = require('./CreateGroup') as typeof import('./CreateGroup');

describe('CreateGroup', () => {
  afterEach(resetStores);

  beforeEach(() => {
    mutateAsync.mockReset().mockImplementation(async (_input, options) => {
      options?.onSuccess?.({ id: 42 });
      return { id: 42 };
    });
    refetch.mockClear();
    push.mockClear().mockResolvedValue(true);
  });

  it('validates an empty name and submits the accessible form', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateGroup>
        <button type="button">New group</button>
      </CreateGroup>,
    );

    await user.click(screen.getByRole('button', { name: 'New group' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('creates the group, refreshes groups, and navigates to it', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateGroup>
        <button type="button">New group</button>
      </CreateGroup>,
    );

    await user.click(screen.getByRole('button', { name: 'New group' }));
    await user.type(await screen.findByPlaceholderText('Group name'), 'Trip');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ name: 'Trip' }, expect.anything()),
    );
    expect(refetch).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/groups/42');
  });
});
