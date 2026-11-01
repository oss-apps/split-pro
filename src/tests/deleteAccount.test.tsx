/** @jest-environment jsdom */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';

import { DeleteAccount } from '~/components/Account/DeleteAccount';
import { renderWithProviders } from '~/tests/helpers/render';

const mockDelete = jest.fn();
jest.mock('~/utils/api', () => ({
  api: { user: { deleteAccount: { useMutation: () => ({ mutateAsync: mockDelete }) } } },
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

describe('DeleteAccount', () => {
  it('explains retained history and cancels without deleting', () => {
    renderWithProviders(<DeleteAccount />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('outstanding balances');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('keeps the dialog open after failure and allows retry', async () => {
    mockDelete.mockRejectedValue(new Error('Unavailable'));
    renderWithProviders(<DeleteAccount />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    const confirm = screen.getByRole('button', { name: 'Permanently delete account' });
    fireEvent.click(confirm);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole('alertdialog')).toBeVisible();
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(2));
  });

  it('prevents duplicate submission and dismissal while deletion is pending', async () => {
    let rejectDeletion: (reason: Error) => void = () => {
      throw new Error('Deletion did not start');
    };
    mockDelete.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectDeletion = reject;
        }),
    );
    renderWithProviders(<DeleteAccount />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    const confirm = screen.getByRole('button', { name: 'Permanently delete account' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(confirm).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(mockDelete).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(screen.getByRole('alertdialog')).toBeVisible();
    rejectDeletion(new Error('Unavailable'));
    await waitFor(() => expect(confirm).toBeEnabled());
  });
});
