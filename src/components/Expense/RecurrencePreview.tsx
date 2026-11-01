import { useTranslation } from 'next-i18next';

import { useIntlCronParser } from '~/hooks/useIntlCronParser';
import { useIsClient } from '~/hooks/useIsClient';
import { api } from '~/utils/api';

interface RecurrencePreviewProps {
  schedule: string;
}

/** Render browser-local times only after hydration; SSR's zone belongs to the server. */
export const RecurrencePreview = ({ schedule }: RecurrencePreviewProps) => {
  const { t, i18n } = useTranslation();
  const { cronParser } = useIntlCronParser();
  const isClient = useIsClient();
  const preview = api.expense.getRecurrencePreview.useQuery(
    { cronExpression: schedule },
    { refetchInterval: 60_000 },
  );

  if (preview.isError) {
    return <span>{t('recurrence.execution_time_unavailable')}</span>;
  }
  if (!preview.data || !isClient) {
    return <span>{t('recurrence.execution_time_loading')}</span>;
  }

  const browserTimeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { nextRun, timeZone, schedule: serverSchedule } = preview.data;
  const localDate = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: browserTimeZone,
  }).format(nextRun);

  return (
    <span className="flex flex-col gap-1">
      <span>{t('recurrence.next_local_run', { date: localDate, timeZone: browserTimeZone })}</span>
      <span className="text-muted-foreground text-xs">
        {t('recurrence.instance_schedule', {
          schedule: cronParser(serverSchedule.replaceAll('$', 'L')),
          timeZone,
        })}
      </span>
    </span>
  );
};
