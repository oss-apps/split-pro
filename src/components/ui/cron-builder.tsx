// copied from: https://github.com/vpfaiz/cron-builder-ui/
import cronstrue from 'cronstrue';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from './toggle-group';

export interface CronTextResult {
  status: boolean;
  value?: string;
}

export function getCronText(cronString: string): CronTextResult {
  try {
    const value = cronstrue.toString(cronString.trim());
    return { status: true, value };
  } catch (error) {
    return { status: false };
  }
}

export interface CronBuilderProps {
  onChange: (cronExpression: string) => void;
  defaultValue?: string;
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

const SCHEDULE_TYPES = [
  { value: 'never', label: 'Never' },
  { value: 'hour', label: 'Hourly' },
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
] as const;

type ScheduleType = (typeof SCHEDULE_TYPES)[number];

const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);
const COMMON_MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Enhanced button style utility with multiple states
const getButtonStyles = (state = 'default'): string => {
  const base = 'px-2 py-1 text-xs rounded border transition-colors';

  switch (state) {
    case 'selected':
      return `${base} bg-[hsl(var(--selected))] text-[hsl(var(--selected-foreground))] border-[hsl(var(--selected))]`;
    case 'pressed':
      return `${base} bg-[hsl(var(--pressed))] text-[hsl(var(--pressed-foreground))] border-[hsl(var(--pressed))]`;
    case 'disabled':
      return `${base} bg-[hsl(var(--disabled))] text-[hsl(var(--disabled-foreground))] border-[hsl(var(--disabled))] cursor-not-allowed`;
    case 'loading':
      return `${base} bg-[hsl(var(--processing))] text-[hsl(var(--processing-foreground))] border-[hsl(var(--processing))]`;
    case 'focused':
      return `${base} bg-[hsl(var(--focused))] text-[hsl(var(--focused-foreground))] border-[hsl(var(--focused))] outline-none ring-2 ring-[hsl(var(--focused)/50%)]`;
    default:
      return `${base} bg-background text-foreground border-border hover:bg-[hsl(var(--selected))] hover:text-[hsl(var(--selected-foreground))] focus:bg-[hsl(var(--focused))] focus:text-[hsl(var(--focused-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--focused)/50%)] active:bg-[hsl(var(--pressed))] active:text-[hsl(var(--pressed-foreground))]`;
  }
};

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
    const [isPressed, setIsPressed] = useState(false);

    return (
      <button
        type="button"
        onClick={() => !disabled && onClick(value)}
        onMouseDown={() => !disabled && setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => !disabled && setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        className={`${getButtonStyles(
          disabled ? 'disabled' : isPressed ? 'pressed' : isSelected ? 'selected' : 'default',
        )} ${className}`}
        style={{ minWidth }}
        disabled={disabled}
      >
        {children || (typeof value === 'number' ? value.toString().padStart(2, '0') : value)}
      </button>
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
  renderHoursGrid: () => React.ReactNode;
  renderMinutesGrid: () => React.ReactNode;
}

const ScheduleFields = React.memo<ScheduleFieldsProps>(
  ({
    scheduleType,
    renderDaysOfWeekList,
    renderMonthsGrid,
    renderDaysOfMonthGrid,
    renderHoursGrid,
    renderMinutesGrid,
  }) => {
    if (scheduleType === 'week') {
      return (
        <div className="flex flex-col gap-4">
          <div className="w-full">{renderDaysOfWeekList()}</div>
          <div className="flex flex-wrap items-start gap-6">
            {renderHoursGrid()}
            {renderMinutesGrid()}
          </div>
        </div>
      );
    }

    if (scheduleType === 'year') {
      return (
        <div className="grid w-fit grid-cols-2 items-start gap-6">
          <div>{renderMonthsGrid()}</div>
          <div>{renderDaysOfMonthGrid()}</div>
          <div>{renderHoursGrid()}</div>
          <div>{renderMinutesGrid()}</div>
        </div>
      );
    }

    if (scheduleType === 'month') {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start gap-6">{renderDaysOfMonthGrid()}</div>
          <div className="flex flex-wrap items-start gap-6">
            {renderHoursGrid()}
            {renderMinutesGrid()}
          </div>
        </div>
      );
    }

    if (scheduleType === 'day') {
      return (
        <div className="flex flex-wrap items-start gap-6">
          {renderHoursGrid()}
          {renderMinutesGrid()}
        </div>
      );
    }

    if (scheduleType === 'hour') {
      return <div className="flex flex-wrap items-start gap-6">{renderMinutesGrid()}</div>;
    }

    return null;
  },
);

ScheduleFields.displayName = 'ScheduleFields';

export function CronBuilder({ onChange, defaultValue, className }: CronBuilderProps) {
  const defaultSchedule = defaultValue || '0 0 * * 0'; // Use provided default or fallback

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
      if (part === '*' || part === '?' || !part) return [];
      return part
        .split(',')
        .map((v) => parseInt(v.trim(), 10))
        .filter((v) => !isNaN(v));
    };

    try {
      // Check for standard patterns
      if (min !== '*' && hour === '*' && dom === '*' && month === '*' && dow === '?') {
        return { type: 'hour', values: { minutes: parseNumbers(min) } };
      } else if (min !== '*' && hour !== '*' && dom === '*' && month === '*' && dow === '?') {
        return {
          type: 'day',
          values: {
            minutes: parseNumbers(min),
            hours: parseNumbers(hour),
          },
        };
      } else if (min !== '*' && hour !== '*' && dom === '?' && month === '*' && dow !== '*') {
        return {
          type: 'week',
          values: {
            minutes: parseNumbers(min),
            hours: parseNumbers(hour),
            daysOfWeek: parseNumbers(dow),
          },
        };
      } else if (min !== '*' && hour !== '*' && dom !== '*' && month === '*' && dow === '?') {
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
  const [daysOfMonth, setDaysOfMonth] = useState<number[]>(initialParsed.values.daysOfMonth || [1]);
  const [months, setMonths] = useState<number[]>(initialParsed.values.months || [1]);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initialParsed.values.daysOfWeek || [0]);
  const [custom, setCustom] = useState<string>(initialParsed.values.custom || defaultSchedule);
  const [cronExpression, setCronExpression] = useState(defaultSchedule);
  const [showAllMinutes, setShowAllMinutes] = useState(false);

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
      case 'hour':
        expression = `${minutesCSV} * * * ?`;
        break;
      case 'day':
        expression = `${minutesCSV} ${hoursCSV} * * ?`;
        break;
      case 'week':
        expression = `${minutesCSV} ${hoursCSV} ? * ${dowCSV}`;
        break;
      case 'month':
        expression = `${minutesCSV} ${hoursCSV} ${domCSV} * ?`;
        break;
      case 'year':
        expression = `${minutesCSV} ${hoursCSV} ${domCSV} ${monthsCSV} ?`;
        break;
      case 'custom':
        expression = custom || '';
        break;
      default:
        expression = '';
    }

    if (getCronText(expression).status) {
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
    const [isPressed, setIsPressed] = useState(false);

    return (
      <button
        key={index}
        type="button"
        onClick={() => onClick(index)}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        className={`px-3 py-1 ${getButtonStyles(
          isPressed ? 'pressed' : isSelected ? 'selected' : 'default',
        )}`}
      >
        {month}
      </button>
    );
  });

  MonthButton.displayName = 'MonthButton';

  const renderMonthsGrid = () => (
    <div className="flex w-fit flex-col gap-2">
      <label className="text-foreground text-xs font-medium">Months</label>
      <div className="grid w-fit grid-cols-3 gap-1">
        {MONTHS_SHORT.map((month, index) => (
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
    const dayNum = typeof dayIndex === 'number' ? dayIndex : parseInt(dayIndex, 10);
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
      const [isPressed, setIsPressed] = useState(false);

      return (
        <button
          key={index}
          type="button"
          onClick={() => onClick(index)}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
          className={`px-3 py-1 text-center ${getButtonStyles(
            isPressed ? 'pressed' : isSelected ? 'selected' : 'default',
          )} ${isWeekend ? 'text-orange-500' : ''}`}
          style={{ minWidth: '50px' }}
        >
          {day}
        </button>
      );
    },
  );

  DayOfWeekButton.displayName = 'DayOfWeekButton';

  const renderDaysOfWeekList = () => {
    const weekendDays = [0, 6];

    return (
      <div className="flex w-full flex-col gap-2">
        <label className="text-foreground text-xs font-medium">Days of Week</label>
        <div className="flex w-full flex-row justify-start gap-1">
          {DAYS_SHORT.map((day, index) => {
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
    const dayNum = typeof day === 'number' ? day : parseInt(day, 10);
    setDaysOfMonth((prev) =>
      prev.includes(dayNum) ? prev.filter((d) => d !== dayNum) : [...prev, dayNum],
    );
  }, []);

  const renderDaysOfMonthGrid = () => (
    <div className="flex w-fit flex-col gap-2">
      <label className="text-foreground text-xs font-medium">Days of Month</label>
      <div className="grid w-fit grid-cols-7 gap-1">
        {DAYS_OF_MONTH.map((day) => (
          <GridButton
            key={day}
            value={day}
            isSelected={daysOfMonth.includes(day)}
            onClick={handleDayOfMonthToggle}
          />
        ))}
      </div>
    </div>
  );

  const handleHourToggle = useCallback((hour: number | string) => {
    const hourNum = typeof hour === 'number' ? hour : parseInt(hour, 10);
    setHours((prev) =>
      prev.includes(hourNum) ? prev.filter((h) => h !== hourNum) : [...prev, hourNum],
    );
  }, []);

  const renderHoursGrid = () => (
    <div className="flex w-fit flex-col gap-2">
      <label className="text-foreground text-xs font-medium">Hours</label>
      <div className="grid w-fit grid-cols-6 gap-1">
        {HOURS.map((hour) => (
          <GridButton
            key={hour}
            value={hour}
            isSelected={hours.includes(hour)}
            onClick={handleHourToggle}
          />
        ))}
      </div>
    </div>
  );

  const handleMinuteToggle = useCallback((minute: number | string) => {
    const minuteNum = typeof minute === 'number' ? minute : parseInt(minute, 10);
    setMinutes((prev) =>
      prev.includes(minuteNum) ? prev.filter((m) => m !== minuteNum) : [...prev, minuteNum],
    );
  }, []);

  const minutesToShow = useMemo(
    () => (showAllMinutes ? MINUTES : COMMON_MINUTES),
    [showAllMinutes],
  );

  const renderMinutesGrid = () => (
    <div className="flex w-fit flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="text-foreground text-xs font-medium">Minutes</label>
        <span className="text-muted-foreground text-xs">({showAllMinutes ? 'All' : 'Common'})</span>
        <button
          type="button"
          onClick={() => setShowAllMinutes(!showAllMinutes)}
          className="border-border hover:bg-accent rounded border px-1 pb-0.5 text-xs transition-colors"
          aria-label={showAllMinutes ? 'Show fewer minutes' : 'Show more minutes'}
        >
          {showAllMinutes ? '−' : '+'}
        </button>
      </div>
      <div className={`grid w-fit gap-1 ${showAllMinutes ? 'grid-cols-12' : 'grid-cols-6'}`}>
        {minutesToShow.map((minute) => (
          <GridButton
            key={minute}
            value={minute}
            isSelected={minutes.includes(minute)}
            onClick={handleMinuteToggle}
          />
        ))}
      </div>
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
            className="w-fit justify-start"
          >
            {SCHEDULE_TYPES.map(({ value, label }) => (
              <ToggleGroupItem key={value} value={value} className="h-8 px-3 py-1 text-xs">
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {scheduleType === 'never' ? (
          <div className="text-muted-foreground mt-2 text-sm">No schedule configured</div>
        ) : (
          <div className="flex flex-col gap-4">
            {scheduleType === 'custom' ? (
              <div className="bg-card border-border flex w-full flex-col gap-2 rounded-md border p-3">
                <label
                  htmlFor="custom-schedule"
                  className="text-card-foreground text-xs font-medium"
                >
                  Cron Expression
                </label>
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
                renderHoursGrid={renderHoursGrid}
                renderMinutesGrid={renderMinutesGrid}
              />
            )}

            {(() => {
              const cronString = getCronText(cronExpression);
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
                  <p className="bg-destructive text-destructive-foreground rounded-sm p-3">
                    Invalid cron expression
                  </p>
                );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

export default CronBuilder;
