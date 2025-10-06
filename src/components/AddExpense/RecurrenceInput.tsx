import { useTranslation } from 'next-i18next';
import React from 'react';
import { useAddExpenseStore } from '~/store/addStore';
import { CronBuilder } from '../ui/cron-builder';
import { AppDrawer } from '../ui/drawer';

export const RecurrenceInput: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { t } = useTranslation();

  const cronExpression = useAddExpenseStore((s) => s.cronExpression);
  const setCronExpression = useAddExpenseStore((s) => s.actions.setCronExpression);

  return (
    <AppDrawer
      title={t('recurrence.title')}
      trigger={children}
      shouldCloseOnAction
      actionTitle={t('actions.confirm')}
      className="h-[70vh]"
    >
      <CronBuilder value={cronExpression} onChange={setCronExpression} />
    </AppDrawer>
  );
};
