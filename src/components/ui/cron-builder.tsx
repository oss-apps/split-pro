// copied from: https://github.com/vpfaiz/cron-builder-ui/
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from './toggle-group';
import { Label } from './label';
import { Input } from './input';
import { Button } from './button';
import { cn } from '~/lib/utils';
import { format } from 'date-fns';
import { TFunction, useTranslation } from 'next-i18next';
import { useIntlCronParser } from '~/hooks/useIntlCronParser';

export interface CronTextResult {
  status: boolean;
  value?: string;
}

export function getCronText(cronParser: any, cronString: string, locale?: string): CronTextResult {
  try {
    const value = cronParser.toString(cronString.trim(), {
      use24HourTimeFormat: true,
      locale,
    });
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
    daysOfMonth?: number[];
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
    { value: 'custom', label: t('recurrence.schedule_type.custom') },
  ] as const;

type ScheduleType = ReturnType<typeof SCHEDULE_TYPES>[number];

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

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

// GridButton component for reusable grid buttons
interface GridButtonProps {
  value: number | string;
  isSelected: boolean;
  onClick: (value: number | string) => void;
  children?: React.ReactNode;
  minWidth?: string;
  className?: string;
  disabled?: boolean;
}

const GridButton = React.memo<GridButtonProps>(
  ({
    value,
    isSelected,
    onClick,
    children,
    minWidth = '36px',
    className = '',
    disabled = false,
  }) => {
    return (
      <Button
        className={cn(isSelected ? 'bg-primary text-primary-foreground' : '', className)}
        onClick={() => onClick(value)}
        variant="outline"
        style={{ minWidth }}
        disabled={disabled}
      >
        {children || (typeof value === 'number' ? value.toString().padStart(2, '0') : value)}
      </Button>
    );
  },
);

GridButton.displayName = 'GridButton';

// ScheduleFields component to handle layout complexity
interface ScheduleFieldsProps {
  scheduleType: string;
  renderDaysOfWeekList: () => React.ReactNode;
  renderMonthsGrid: () => React.ReactNode;
  renderDaysOfMonthGrid: () => React.ReactNode;
  renderTimeInput: () => React.ReactNode;
}

const ScheduleFields = React.memo<ScheduleFieldsProps>(
  ({
    scheduleType,
    renderDaysOfWeekList,
    renderMonthsGrid,
    renderDaysOfMonthGrid,
    renderTimeInput,
  }) => {
    const outputs = [renderTimeInput];

    if (scheduleType === 'never') {
      return null;
    }

    if (scheduleType === 'week') {
      outputs.push(renderDaysOfWeekList);
    } else if (scheduleType === 'year') {
      outputs.push(renderMonthsGrid);
      outputs.push(renderDaysOfMonthGrid);
    } else if (scheduleType === 'month') {
      outputs.push(renderDaysOfMonthGrid);
    }

    return outputs.map((RenderFunc, index) => (
      <React.Fragment key={index}>{RenderFunc()}</React.Fragment>
    ));
  },
);

ScheduleFields.displayName = 'ScheduleFields';

export function CronBuilder({ onChange, value, className }: CronBuilderProps) {
  const { t, i18n } = useTranslation();

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
            daysOfMonth: parseNumbers(dom),
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
  const [minutes, setMinutes] = useState<number[]>(initialParsed.values.minutes || [0]);
  const [hours, setHours] = useState<number[]>(initialParsed.values.hours || [0]);
  const [daysOfMonth, setDaysOfMonth] = useState<Array<number | 'L'>>(
    initialParsed.values.daysOfMonth || [1],
  );
  const [months, setMonths] = useState<number[]>(initialParsed.values.months || [1]);
  const [daysOfWeek, setDaysOfWeek] = useState<Array<number | 'L'>>(
    initialParsed.values.daysOfWeek || [0],
  );
  const [custom, setCustom] = useState<string>(initialParsed.values.custom || defaultSchedule);
  const [cronExpression, setCronExpression] = useState(defaultSchedule);

  const { cronParser } = useIntlCronParser();

  function loadDefaults() {
    setMinutes([0]);
    setHours([0]);
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
    const cleanHours = (hours || []).filter((v) => v !== undefined && v !== null);
    const cleanMinutes = (minutes || []).filter((v) => v !== undefined && v !== null);

    const monthsCSV = cleanMonths.length === 12 ? '*' : cleanMonths.join(',');
    const domCSV = cleanDaysOfMonth.length === 31 ? '*' : cleanDaysOfMonth.join(',');
    const dowCSV = cleanDaysOfWeek.length === 7 ? '*' : cleanDaysOfWeek.join(',');
    const hoursCSV = cleanHours.length === 24 ? '*' : cleanHours.join(',');
    const minutesCSV = cleanMinutes.length === 60 ? '*' : cleanMinutes.join(',');

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
      case 'custom':
        expression = custom || '';
        break;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleType, minutes, hours, daysOfMonth, months, daysOfWeek, custom]);

  const handleMonthToggle = useCallback((monthIndex: number | string) => {
    const monthNum = (typeof monthIndex === 'number' ? monthIndex : parseInt(monthIndex, 10)) + 1;
    setMonths((prev) =>
      prev.includes(monthNum) ? prev.filter((m) => m !== monthNum) : [...prev, monthNum],
    );
  }, []);

  // Month button component with pressed state
  interface MonthButtonProps {
    month: string;
    index: number;
    isSelected: boolean;
    onClick: (index: number) => void;
  }

  const MonthButton = React.memo<MonthButtonProps>(({ month, index, isSelected, onClick }) => {
    return (
      <Button
        key={index}
        onClick={() => onClick(index)}
        variant="outline"
        className={cn(isSelected ? 'bg-primary text-primary-foreground' : '', className)}
      >
        {month}
      </Button>
    );
  });

  MonthButton.displayName = 'MonthButton';

  const renderMonthsGrid = () => (
    <div className="flex w-fit flex-col gap-2">
      <Label className="px-1 text-xs">{t('recurrence.months')}</Label>
      <div className="grid w-fit grid-cols-3 gap-1">
        {MONTHS_SHORT(i18n.language).map((month, index) => (
          <MonthButton
            key={index}
            month={month}
            index={index}
            isSelected={months.includes(index + 1)}
            onClick={handleMonthToggle}
          />
        ))}
      </div>
    </div>
  );

  const handleDayOfWeekToggle = useCallback((dayIndex: number | string) => {
    const dayNum =
      typeof dayIndex === 'number' || dayIndex === 'L' ? dayIndex : parseInt(dayIndex, 10);
    setDaysOfWeek((prev) =>
      prev.includes(dayNum) ? prev.filter((d) => d !== dayNum) : [...prev, dayNum],
    );
  }, []);

  // Day of week button component with pressed state
  interface DayOfWeekButtonProps {
    day: string;
    index: number;
    isSelected: boolean;
    isWeekend: boolean;
    onClick: (index: number) => void;
  }

  const DayOfWeekButton = React.memo<DayOfWeekButtonProps>(
    ({ day, index, isSelected, isWeekend, onClick }) => {
      return (
        <Button
          key={index}
          type="button"
          onClick={() => onClick(index)}
          style={{ minWidth: '50px' }}
          variant="outline"
          className={cn(
            isSelected ? 'bg-primary text-primary-foreground' : '',
            isWeekend ? 'text-red-500' : '',
            className,
          )}
        >
          {day}
        </Button>
      );
    },
  );

  DayOfWeekButton.displayName = 'DayOfWeekButton';

  const renderDaysOfWeekList = () => {
    const weekendDays = [0, 6];

    return (
      <div className="flex w-full flex-col gap-2">
        <Label className="px-1 text-xs">{t('recurrence.days_of_week')}</Label>
        <div className="flex w-full flex-row flex-wrap justify-start gap-1">
          {DAYS_SHORT(i18n.language).map((day, index) => {
            const isWeekend = weekendDays.includes(index);
            const isSelected = daysOfWeek.includes(index);
            return (
              <DayOfWeekButton
                key={index}
                day={day}
                index={index}
                isSelected={isSelected}
                isWeekend={isWeekend}
                onClick={handleDayOfWeekToggle}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const handleDayOfMonthToggle = useCallback((day: number | string) => {
    const dayNum = typeof day === 'number' || day === 'L' ? day : parseInt(day, 10);
    setDaysOfMonth((prev) =>
      prev.includes(dayNum) ? prev.filter((d) => d !== dayNum) : [...prev, dayNum],
    );
  }, []);

  const renderDaysOfMonthGrid = () => (
    <div className="flex w-fit flex-col gap-2">
      <Label className="px-1 text-xs">{t('recurrence.days_of_month')}</Label>
      <div className="grid w-fit grid-cols-7 gap-1">
        {DAYS_OF_MONTH.map((day) => (
          <GridButton
            key={day}
            value={day}
            isSelected={daysOfMonth.includes(day)}
            onClick={handleDayOfMonthToggle}
          />
        ))}
        <GridButton
          key="L"
          value="L"
          isSelected={daysOfMonth.includes('L')}
          onClick={handleDayOfMonthToggle}
        />
      </div>
    </div>
  );

  const renderTimeInput = () => {
    const [value, setValue] = useState(
      format(new Date().setHours(hours[0] || 0, minutes[0] || 0), 'HH:mm'),
    );

    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor="time-picker" className="px-1 text-xs">
          {t('recurrence.time_of_day')}
        </Label>
        <Input
          type="time"
          id="time-picker"
          value={value}
          onChange={(e) => {
            const date = e.target.valueAsDate;
            setValue(e.target.value);
            if (date) {
              setHours([date.getHours()]);
              setMinutes([date.getMinutes()]);
            }
          }}
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    );
  };

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
                  placeholder="0 0 * * 0"
                />
              </div>
            ) : (
              <ScheduleFields
                scheduleType={scheduleType}
                renderDaysOfWeekList={renderDaysOfWeekList}
                renderMonthsGrid={renderMonthsGrid}
                renderDaysOfMonthGrid={renderDaysOfMonthGrid}
                renderTimeInput={renderTimeInput}
              />
            )}

            <div className="h-19">
              {(() => {
                const cronString = getCronText(
                  cronParser,
                  cronExpression,
                  i18n.language.split('-')[0],
                );
                if (cronString.status)
                  return (
                    <p className="bg-card text-card-foreground overflow-clip rounded-sm p-3">
                      {cronString.value}{' '}
                      <span className="bg-accent text-accent-foreground rounded-sm p-1 px-2 font-mono">
                        cron({cronExpression})
                      </span>
                    </p>
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
