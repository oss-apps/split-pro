import { RefreshCcwDot } from 'lucide-react';
import { useTranslation } from 'next-i18next';

export const RecurringExpenseIndicator = () => {
  const { t } = useTranslation();

  return (
    <span className="inline-flex shrink-0" title={t('recurrence.recurring')}>
      <RefreshCcwDot className="size-3" aria-hidden="true" />
      <span className="sr-only">{t('recurrence.recurring')}</span>
    </span>
  );
};
