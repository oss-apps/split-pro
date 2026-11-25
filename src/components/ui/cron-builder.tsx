// copied from: https://github.com/vpfaiz/cron-builder-ui/
import { type TFunction, useTranslation } from 'next-i18next';
import React, { useEffect, useId, useState } from 'react';

import { useIntlCronParser } from '~/hooks/useIntlCronParser';

import { RecurrencePreview } from '../Expense/RecurrencePreview';

import { Label } from './label';
import { ToggleGroup, ToggleGroupItem } from './toggle-group';

export interface CronTextResult {
  status: boolean;
  value?: string;
}

export function getCronText(cronParser: any, cronString: string): CronTextResult {
  try {
    const value = cronParser(cronString.trim());
    return { status: true, value };
  } catch (error) {
    return { status: false };
  }
}

export interface CronBuilderProps {
  onChange: (cronExpression: string) => void;
  value: string;
  className?: string;
}

interface ParsedCron {
  type: string;
  values: {
    minutes?: number[];
    hours?: number[];
    daysOfMonth?: Array<number | 'L'>;
    months?: number[];
    daysOfWeek?: number[];
    custom?: string;
  };
}

const SCHEDULE_TYPES = (t: TFunction) =>
  [
    { value: 'never', label: t('recurrence.schedule_type.never') },
    { value: 'day', label: t('recurrence.schedule_type.day') },
    { value: 'week', label: t('recurrence.schedule_type.week') },
    { value: 'month', label: t('recurrence.schedule_type.month') },
    { value: 'year', label: t('recurrence.schedule_type.year') },
  ] as const;

type ScheduleType = ReturnType<typeof SCHEDULE_TYPES>[number];

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);
// Yearly February 29 rules remain available for leap years.
const MONTH_LENGTHS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

const MONTHS_SHORT = (code: string) =>
  Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2000, i, 1); // Year 2000, month i, day 1
    return new Intl.DateTimeFormat(code, { month: 'short' }).format(date);
  });

const DAYS_SHORT = (code: string) =>
  Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2000, 0, 2 + i); // Jan 2, 2000 was a Sunday
    return new Intl.DateTimeFormat(code, { weekday: 'short' }).format(date);
  });

// ScheduleFields component to handle layout complexity
interface ScheduleFieldsProps {
  scheduleType: string;
  renderDaysOfWeekSelect: () => React.ReactNode;
  renderMonthsSelect: () => React.ReactNode;
  renderDaysOfMonthSelect: () => React.ReactNode;
}

const ScheduleFields = React.memo<ScheduleFieldsProps>(
  ({ scheduleType, renderDaysOfWeekSelect, renderMonthsSelect, renderDaysOfMonthSelect }) => {
    const outputs: Array<() => React.ReactNode> = [];

    if ('never' === scheduleType) {
      return null;
    }

    if ('week' === scheduleType) {
      outputs.push(renderDaysOfWeekSelect);
    } else if ('year' === scheduleType) {
      outputs.push(renderMonthsSelect);
      outputs.push(renderDaysOfMonthSelect);
    } else if ('month' === scheduleType) {
      outputs.push(renderDaysOfMonthSelect);
    }

    return outputs.map((RenderFunc, index) => (
      <React.Fragment key={index}>{RenderFunc()}</React.Fragment>
    ));
  },
);

ScheduleFields.displayName = 'ScheduleFields';

export function CronBuilder({ onChange, value, className }: CronBuilderProps) {
  const { t, i18n } = useTranslation();
  const fieldId = useId();

  const defaultSchedule = value; // Use provided default or fallback

  // Helper function to parse cron expression and determine schedule type
  const parseCronExpression = (cronExpr: string): ParsedCron => {
    if (!cronExpr || cronExpr === '') return { type: 'never', values: {} };

    // Clean and validate the cron expression
    const cleanExpr = cronExpr.trim();
    const parts = cleanExpr.split(' ');
    if (parts.length !== 5) return { type: 'custom', values: { custom: cleanExpr } };

    const [min, hour, dom, month, dow] = parts;

    // Helper to safely parse numeric values from cron parts
    const parseNumbers = (part?: string): number[] => {
      if (part === '*' || !part) return [];
      return part
        .split(',')
        .map((v) => parseInt(v.trim(), 10))
        .filter((v) => !isNaN(v));
    };

    try {
      // Check for standard patterns
      if (min !== '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
        return { type: 'hour', values: { minutes: parseNumbers(min) } };
      } else if (min !== '*' && hour !== '*' && dom === '*' && month === '*' && dow === '*') {
        return {
          type: 'day',
          values: {
            minutes: parseNumbers(min),
            hours: parseNumbers(hour),
          },
        };
      } else if (min !== '*' && hour !== '*' && dom === '*' && month === '*' && dow !== '*') {
        return {
          type: 'week',
          values: {
            minutes: parseNumbers(min),
            hours: parseNumbers(hour),
            daysOfWeek: parseNumbers(dow),
          },
        };
      } else if (min !== '*' && hour !== '*' && dom !== '*' && month === '*' && dow === '*') {
        return {
          type: 'month',
          values: {
            minutes: parseNumbers(min),
            hours: parseNumbers(hour),
            daysOfMonth: 'L' === dom ? ['L'] : parseNumbers(dom),
          },
        };
      } else if (dom !== '*' && month !== '*' && dow === '*') {
        return {
          type: 'year',
          values: {
            daysOfMonth: 'L' === dom ? ['L'] : parseNumbers(dom),
            months: parseNumbers(month),
          },
        };
      } else {
        return { type: 'custom', values: { custom: cleanExpr } };
      }
    } catch (error) {
      console.warn('Error parsing cron expression:', error);
      return { type: 'custom', values: { custom: cleanExpr } };
    }
  };

  const initialParsed = parseCronExpression(defaultSchedule);

  const [scheduleType, setScheduleType] = useState(initialParsed.type);
  const [daysOfMonth, setDaysOfMonth] = useState<Array<number | 'L'>>(
    initialParsed.values.daysOfMonth || [1],
  );
  const [months, setMonths] = useState<number[]>(initialParsed.values.months || [1]);
  const [daysOfWeek, setDaysOfWeek] = useState<Array<number | 'L'>>(
    initialParsed.values.daysOfWeek || [0],
  );
  const [custom, setCustom] = useState<string>(
    (initialParsed.values.custom || defaultSchedule).trim().split(/\s+/).slice(-3).join(' '),
  );
  const [cronExpression, setCronExpression] = useState(defaultSchedule);

  const { cronParser } = useIntlCronParser();

  function loadDefaults() {
    setDaysOfMonth([1]);
    setMonths([1]);
    setDaysOfWeek([0]);
  }

  useEffect(() => {
    let expression = '';

    // Filter out undefined/null values and ensure valid arrays
    const cleanMonths = (months || []).filter((v) => v !== undefined && v !== null);
    const cleanDaysOfMonth = (daysOfMonth || []).filter((v) => v !== undefined && v !== null);
    const cleanDaysOfWeek = (daysOfWeek || []).filter((v) => v !== undefined && v !== null);

    const monthsCSV = cleanMonths.length === 12 ? '*' : cleanMonths.join(',');
    const domCSV = cleanDaysOfMonth.length === 31 ? '*' : cleanDaysOfMonth.join(',');
    const dowCSV = cleanDaysOfWeek.length === 7 ? '*' : cleanDaysOfWeek.join(',');
    const hoursCSV = '0';
    const minutesCSV = '0';

    switch (scheduleType) {
      case 'day':
        expression = `${minutesCSV} ${hoursCSV} * * *`;
        break;
      case 'week':
        expression = `${minutesCSV} ${hoursCSV} * * ${dowCSV}`;
        break;
      case 'month':
        expression = `${minutesCSV} ${hoursCSV} ${domCSV} * *`;
        break;
      case 'year':
        expression = `${minutesCSV} ${hoursCSV} ${domCSV} ${monthsCSV} *`;
        break;
      case 'custom': {
        const fields = custom.trim().split(/\s+/);
        expression = 3 === fields.length ? `0 0 ${fields.join(' ')}` : '';
        break;
      }
      default:
        expression = '';
    }

    if (getCronText(cronParser, expression).status) {
      setCronExpression(expression);
      onChange(expression);
    } else {
      setCronExpression('');
      onChange('');
    }
  }, [scheduleType, daysOfMonth, months, daysOfWeek, custom]);

  const renderMonthsSelect = () => (
    <div className="flex flex-col gap-2">
      <Label id={`${fieldId}-months`} className="px-1 text-xs">
        {t('recurrence.months')}
      </Label>
      <ToggleGroup
        type="single"
        variant="outline"
        value={String(months[0] ?? 1)}
        onValueChange={(value) => {
          if (!value) return;
          const month = Number(value);
          const lastDay = MONTH_LENGTHS[month - 1] ?? 31;
          setMonths([month]);
          setDaysOfMonth((days) => days.map((day) => ('L' === day ? day : Math.min(day, lastDay))));
        }}
        aria-labelledby={`${fieldId}-months`}
        className="grid grid-cols-4"
      >
        {MONTHS_SHORT(i18n.language).map((month, index) => (
          <ToggleGroupItem key={index} value={String(index + 1)}>
            {month}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );

  const renderDaysOfWeekSelect = () => (
    <div className="flex flex-col gap-2">
      <Label id={`${fieldId}-weekdays`} className="px-1 text-xs">
        {t('recurrence.days_of_week')}
      </Label>
      <ToggleGroup
        type="single"
        variant="outline"
        value={String(daysOfWeek[0] ?? 0)}
        onValueChange={(value) => {
          if (value) setDaysOfWeek([Number(value)]);
        }}
        aria-labelledby={`${fieldId}-weekdays`}
        className="grid grid-cols-7"
      >
        {DAYS_SHORT(i18n.language).map((day, index) => (
          <ToggleGroupItem key={index} value={String(index)} className="min-w-0 px-0 text-xs">
            {day}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );

  const availableDays = 'year' === scheduleType ? (MONTH_LENGTHS[(months[0] ?? 1) - 1] ?? 31) : 31;

  const renderDaysOfMonthSelect = () => (
    <div className="flex flex-col gap-2">
      <Label id={`${fieldId}-monthdays`} className="px-1 text-xs">
        {t('recurrence.days_of_month')}
      </Label>
      <ToggleGroup
        type="single"
        variant="outline"
        value={String(daysOfMonth[0] ?? 1)}
        onValueChange={(value) => {
          if (value) setDaysOfMonth(['L' === value ? 'L' : Number(value)]);
        }}
        aria-labelledby={`${fieldId}-monthdays`}
        className="grid grid-cols-7"
      >
        {DAYS_OF_MONTH.slice(0, availableDays).map((day) => (
          <ToggleGroupItem key={day} value={String(day)} className="min-w-0 px-0 text-xs">
            {day.toString().padStart(2, '0')}
          </ToggleGroupItem>
        ))}
        <ToggleGroupItem value="L" className="col-span-4">
          {t('recurrence.last_day')}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );

  // Render Cron expression builder UI
  return (
    <div className={`flex flex-grow flex-col ${className || ''}`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <ToggleGroup
            type="single"
            value={scheduleType}
            onValueChange={(value: ScheduleType['value']) => {
              if (value) {
                loadDefaults();
                setScheduleType(value);
              }
            }}
            className="w-fit flex-wrap justify-start"
          >
            {SCHEDULE_TYPES(t).map(({ value, label }) => (
              <ToggleGroupItem key={value} value={value} className="h-8 px-3 py-1 text-xs">
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {scheduleType === 'never' ? (
          <div className="text-muted-foreground mt-2 text-sm">{t('recurrence.never')}</div>
        ) : (
          <div className="flex flex-col gap-4">
            {scheduleType === 'custom' ? (
              <div className="bg-card border-border flex w-full flex-col gap-2 rounded-md border p-3">
                <Label
                  htmlFor="custom-schedule"
                  className="text-card-foreground text-xs font-medium"
                >
                  {t('recurrence.cron_expression')}
                </Label>
                <input
                  type="text"
                  id="custom-schedule"
                  name="schedule"
                  value={custom}
                  onChange={(event) => {
                    setCustom(event.target.value);
                  }}
                  className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-[50%] rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
                  placeholder="* * 0"
                />
              </div>
            ) : (
              <ScheduleFields
                scheduleType={scheduleType}
                renderDaysOfWeekSelect={renderDaysOfWeekSelect}
                renderMonthsSelect={renderMonthsSelect}
                renderDaysOfMonthSelect={renderDaysOfMonthSelect}
              />
            )}

            <div aria-live="polite">
              {(() => {
                const cronString = getCronText(cronParser, cronExpression);
                if (cronString.status)
                  return (
                    <div className="bg-card text-card-foreground rounded-sm p-3">
                      <RecurrencePreview schedule={cronExpression} />
                    </div>
                  );
                else
                  return (
                    <p className={'text-destructive text-sm font-medium'}>
                      {t('errors.invalid_cron_expression')}
                    </p>
                  );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CronBuilder;
