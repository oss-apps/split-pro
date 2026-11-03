/** @jest-environment jsdom */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { type ComponentProps } from 'react';
import { toast } from 'sonner';

import { SelectUserOrGroup } from '~/components/AddExpense/SelectUserOrGroup';
import { useAddExpenseStore } from '~/store/addStore';

import AddMembers from '~/components/group/AddMembers';
import { type AppDrawer } from '~/components/ui/drawer';
import { renderWithProviders } from '~/tests/helpers/render';

const mockInvite = jest.fn();
const mockAdd = jest.fn();
const mockInvalidate = jest.fn().mockResolvedValue(undefined);
jest.mock('~/utils/api', () => ({
  api: {
    user: {
      getFriends: {
        useQuery: () => ({
          data: [{ id: 2, name: 'Alex', email: 'alex@example.com' }],
          isPending: false,
        }),
      },
      inviteFriend: { useMutation: () => ({ mutateAsync: mockInvite }) },
    },
    group: {
      getAllGroups: { useQuery: () => ({ data: [], isPending: false }) },
      addMembers: { useMutation: () => ({ mutateAsync: mockAdd }) },
    },
    useUtils: () => ({ group: { getGroupDetails: { invalidate: mockInvalidate } } }),
  },
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), warning: jest.fn() } }));
jest.mock('~/components/ui/avatar', () => ({ EntityAvatar: () => null }));
jest.mock('~/components/ui/drawer', () => ({
  AppDrawer: (props: ComponentProps<typeof AppDrawer>) => (
    <>
      <button onClick={() => props.onOpenChange?.(true)}>Open</button>
      {props.open ? (
        <div role="dialog">
          {props.children}
          <button onClick={() => props.leftActionOnClick?.()}>Cancel</button>
          <button disabled={props.actionDisabled} onClick={() => props.actionOnClick?.()}>
            Submit
          </button>
        </div>
      ) : null}
    </>
  ),
}));

const setup = (enabled = true) => {
  renderWithProviders(
    <AddMembers
      enableSendingInvites={enabled}
      group={
        { id: 1, groupUsers: [] } as unknown as NonNullable<
          ComponentProps<typeof AddMembers>['group']
        >
      }
    >
      <button>Trigger</button>
    </AddMembers>,
  );
  fireEvent.click(screen.getByText('Open'));
};

describe('AddMembers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvite.mockReset().mockResolvedValue({ id: 3 });
    mockAdd.mockReset().mockResolvedValue(undefined);
  });

  describe('Submission', () => {
    it('adds the typed email and selected contacts together without inviting by default', async () => {
      setup();
      fireEvent.click(screen.getByText('Alex'));
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new@example.com' } });
      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(mockAdd).toHaveBeenCalledWith({ groupId: 1, userIds: [2, 3] }));
      expect(mockInvite).toHaveBeenCalledWith({ email: 'new@example.com', sendInviteEmail: false });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('keeps selection after failure and prevents duplicate submissions', async () => {
      let fail: (error: Error) => void = () => undefined;
      mockAdd.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            fail = reject;
          }),
      );
      setup();
      fireEvent.click(screen.getByText('Alex'));
      fireEvent.click(screen.getByText('Submit'));
      fireEvent.click(screen.getByText('Submit'));
      expect(mockAdd).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Submit')).toBeDisabled();
      fail(new Error('Failed'));
      await waitFor(() => expect(screen.getByText('Submit')).toBeEnabled());
      expect(screen.getByRole('dialog')).toBeVisible();
      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(2));
    });

    it('clears typed email and selections on cancellation', () => {
      setup();
      fireEvent.click(screen.getByText('Alex'));
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new@example.com' } });
      fireEvent.click(screen.getByText('Cancel'));
      fireEvent.click(screen.getByText('Open'));
      expect(screen.getByRole('textbox')).toHaveValue('');
      expect(screen.getByText('Submit')).toBeDisabled();
    });
  });

  describe('Invitations', () => {
    it('reports partial success only after fallback and membership succeed', async () => {
      mockInvite.mockRejectedValueOnce({ data: { appErrorCode: 'INVITE_EMAIL_SEND_FAILED' } });
      setup();
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new@example.com' } });
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() =>
        expect(toast.warning).toHaveBeenCalledWith(
          'Added to the group, but the invitation email could not be sent.',
        ),
      );
      expect(mockInvite).toHaveBeenNthCalledWith(1, {
        email: 'new@example.com',
        sendInviteEmail: true,
      });
      expect(mockInvite).toHaveBeenNthCalledWith(2, {
        email: 'new@example.com',
        sendInviteEmail: false,
      });
      expect(mockAdd).toHaveBeenCalled();
    });

    it('does not claim partial success when group addition fails', async () => {
      mockInvite.mockRejectedValueOnce({ data: { appErrorCode: 'INVITE_EMAIL_SEND_FAILED' } });
      mockAdd.mockRejectedValue(new Error('Failed'));
      setup();
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new@example.com' } });
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.warning).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeVisible();
    });

    it('allows adding without email when invitations are disabled', async () => {
      setup(false);
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new@example.com' } });
      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(mockAdd).toHaveBeenCalled());
      expect(mockInvite).toHaveBeenCalledWith({ email: 'new@example.com', sendInviteEmail: false });
    });
  });
});

describe('Expense participant invitations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvite.mockReset().mockResolvedValue({ id: 3, name: 'New', email: 'new@example.com' });
    useAddExpenseStore.setState({
      nameOrEmail: 'new@example.com',
      participants: [],
      group: undefined,
    });
  });

  it('adds to the draft and reports partial success after the email fallback', async () => {
    mockInvite.mockRejectedValueOnce({ data: { appErrorCode: 'INVITE_EMAIL_SEND_FAILED' } });
    renderWithProviders(<SelectUserOrGroup enableSendingInvites />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Add to Expense' }));
    await waitFor(() =>
      expect(toast.warning).toHaveBeenCalledWith(
        'Added to the draft expense, but the invitation email could not be sent.',
      ),
    );
    expect(useAddExpenseStore.getState().participants.map((p) => p.id)).toEqual([3]);
    expect(mockInvite).toHaveBeenNthCalledWith(2, {
      email: 'new@example.com',
      sendInviteEmail: false,
    });
  });

  it('prevents duplicate requests without adding a temporary participant', async () => {
    let finish: (user: { id: number; email: string }) => void = () => undefined;
    mockInvite.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    renderWithProviders(<SelectUserOrGroup enableSendingInvites={false} />);
    const add = screen.getByRole('button', { name: 'Add to Expense' });
    fireEvent.click(add);
    fireEvent.click(add);
    expect(mockInvite).toHaveBeenCalledTimes(1);
    expect(add).toBeDisabled();
    expect(useAddExpenseStore.getState().participants).toEqual([]);
    finish({ id: 3, email: 'new@example.com' });
    await waitFor(() => expect(useAddExpenseStore.getState().participants).toHaveLength(1));
    expect(toast.warning).not.toHaveBeenCalled();
  });
});
