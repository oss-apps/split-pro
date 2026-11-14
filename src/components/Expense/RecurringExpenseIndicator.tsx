import { RefreshCcwDot } from 'lucide-react';
import { useTranslation } from 'next-i18next';

export const RecurringExpenseIndicator = () => {
  const { t } = useTranslation();

  return (
    <span className="relative inline-flex shrink-0" title={t('recurrence.recurring')}>
      <RefreshCcwDot className="size-3" aria-hidden="true" />
      <span className="sr-only">{t('recurrence.recurring')}</span>
      <span
        aria-hidden="true"
        className="bg-popover text-popover-foreground pointer-events-none absolute top-full left-0 z-10 mt-1 hidden rounded-md border px-2 py-1 text-xs whitespace-nowrap shadow-md group-focus-visible/expense:block"
      >
        {t('recurrence.recurring')}
      </span>
    </span>
  );
};
