import { useTranslation } from 'next-i18next';
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { cronToBackend } from '~/lib/cron';
import { api } from '~/utils/api';

import { SimpleConfirmationDialog } from '../SimpleConfirmationDialog';
import { CronBuilder } from '../ui/cron-builder';
import { AppDrawer } from '../ui/drawer';

interface EditRecurrenceDialogProps {
  recurrenceId: number;
  currentSchedule: string | null;
  children: React.ReactNode;
}

const FALLBACK_CRON = '0 0 1 * *'; // Default to monthly on the 1st if no current schedule is provided due to error

export const EditRecurrenceDialog: React.FC<EditRecurrenceDialogProps> = ({
  recurrenceId,
  currentSchedule,
  children,
}) => {
  const { t } = useTranslation();
  const [cronValue, setCronValue] = useState(currentSchedule ?? FALLBACK_CRON);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const updateMutation = api.expense.updateRecurrence.useMutation();
  const apiUtils = api.useUtils();

  const handleDrawerConfirm = useCallback(() => {
    // Close drawer and open confirmation dialog
    setDrawerOpen(false);
    setConfirmOpen(true);
  }, []);

  const handleConfirm = useCallback(async () => {
    try {
      await updateMutation.mutateAsync({
        recurrenceId,
        cronExpression: cronToBackend(cronValue),
      });
      await apiUtils.expense.getRecurringExpenses.invalidate();
      setConfirmOpen(false);
    } catch (error) {
      toast.error(t('errors.recurrence_update_failed'));
      console.error('Error updating recurrence:', error);
    }
  }, [updateMutation, recurrenceId, cronValue, apiUtils.expense.getRecurringExpenses, t]);

  const handleCancel = useCallback(() => {
    setConfirmOpen(false);
    // Reset cron value to original
    setCronValue(currentSchedule ?? FALLBACK_CRON);
  }, [currentSchedule]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setDrawerOpen(open);
      if (open) {
        // Reset to current schedule when opening
        setCronValue(currentSchedule ?? FALLBACK_CRON);
      }
    },
    [currentSchedule],
  );

  return (
    <>
      <AppDrawer
        title={t('recurrence.title')}
        trigger={children}
        open={drawerOpen}
        onOpenChange={handleOpenChange}
        actionTitle={t('actions.next')}
        actionOnClick={handleDrawerConfirm}
        actionDisabled={!cronValue}
        className="h-[70vh]"
      >
        <CronBuilder value={cronValue} onChange={setCronValue} />
      </AppDrawer>

      <SimpleConfirmationDialog
        open={confirmOpen}
        title={t('recurrence.edit_title')}
        description={t('recurrence.edit_description')}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        hasPermission
        loading={updateMutation.isPending}
      />
    </>
  );
};
