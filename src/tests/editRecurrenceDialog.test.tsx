import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { EditRecurrenceDialog } from '~/components/Expense/EditRecurrenceDialog';
import { cronToBackend } from '~/lib/cron';

const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockInvalidate = jest.fn().mockResolvedValue(undefined);

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('~/utils/api', () => ({
  api: {
    expense: {
      updateRecurrence: {
        useMutation: () => ({ mutateAsync: mockUpdate, isPending: false }),
      },
    },
    useUtils: () => ({ expense: { getRecurringExpenses: { invalidate: mockInvalidate } } }),
  },
}));
jest.mock('~/components/ui/drawer', () => ({
  AppDrawer: ({
    open,
    onOpenChange,
    actionOnClick,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    actionOnClick: () => void;
  }) =>
    createElement(
      'div',
      null,
      createElement('button', { onClick: () => onOpenChange(true) }, 'Edit schedule'),
      open && createElement('button', { onClick: actionOnClick }, 'Next'),
    ),
}));
jest.mock('~/components/ui/cron-builder', () => ({ CronBuilder: () => null }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('EditRecurrenceDialog', () => {
  it('saves and closes its controlled confirmation dialog without a runtime error', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const click = async (label: string) => {
      const button = Array.from(document.querySelectorAll('button')).find(
        (element) => element.textContent === label,
      );
      expect(button).toBeDefined();
      await act(async () => button!.click());
    };

    try {
      await act(async () => {
        root.render(
          <EditRecurrenceDialog recurrenceId={42} currentSchedule="0 0 * * 0">
            <button>Edit</button>
          </EditRecurrenceDialog>,
        );
      });
      await click('Edit schedule');
      await click('Next');
      expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
      await click('actions.confirm');
      expect(mockUpdate).toHaveBeenCalledWith({
        recurrenceId: 42,
        cronExpression: cronToBackend('0 0 * * 0'),
      });
      expect(mockInvalidate).toHaveBeenCalledTimes(1);
      expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
