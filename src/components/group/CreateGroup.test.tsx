/** @jest-environment jsdom */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { renderWithProviders } from '~/tests/helpers/render';

const mutateAsync = jest.fn();
const refetch = jest.fn().mockResolvedValue(undefined);
jest.mock('~/utils/api', () => ({
  api: {
    group: { create: { useMutation: () => ({ mutateAsync }) } },
    useUtils: () => ({ group: { getAllGroupsWithBalances: { refetch } } }),
  },
}));
import { CreateGroup } from './CreateGroup';

describe('CreateGroup', () => {
  beforeEach(() => {
    mutateAsync.mockReset().mockImplementation(async (_input, options) => {
      options?.onSuccess?.({ id: 42 });
      return { id: 42 };
    });
  });

  it('validates an empty name without creating a group', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateGroup>
        <button>New group</button>
      </CreateGroup>,
    );
    await user.click(screen.getByRole('button', { name: 'New group' }));
    await user.click(await screen.findByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('creates the group, refreshes groups, navigates and closes the drawer', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(
      <CreateGroup>
        <button>New group</button>
      </CreateGroup>,
    );
    await user.click(screen.getByRole('button', { name: 'New group' }));
    await user.type(await screen.findByPlaceholderText('Group name'), 'Trip');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/groups/42'));
    expect(mutateAsync).toHaveBeenCalledWith({ name: 'Trip' }, expect.anything());
    expect(refetch).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('cancels without submitting', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateGroup>
        <button>New group</button>
      </CreateGroup>,
    );
    await user.click(screen.getByRole('button', { name: 'New group' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
