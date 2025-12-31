import { useTranslation } from 'next-i18next';
import React from 'react';

import { useAddExpenseStore } from '~/store/addStore';

import { CronBuilder } from '../ui/cron-builder';
import { AppDrawer } from '../ui/drawer';

interface RecurrenceInputProps {
  children: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
}

export const RecurrenceInput: React.FC<RecurrenceInputProps> = ({
  children,
  value: valueProp,
  onChange: onChangeProp,
}) => {
  const { t } = useTranslation();

  // Use props if provided, otherwise fall back to store
  const storeCronExpression = useAddExpenseStore((s) => s.cronExpression);
  const storeSetCronExpression = useAddExpenseStore((s) => s.actions.setCronExpression);

  const cronExpression = valueProp ?? storeCronExpression;
  const setCronExpression = onChangeProp ?? storeSetCronExpression;

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
