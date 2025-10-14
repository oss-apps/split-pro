import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { cn } from '~/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import type { DayPickerProps, PropsSingleRequired } from 'react-day-picker';

export const DateSelector: React.FC<DayPickerProps & PropsSingleRequired> = (calendarProps) => {
  const { t, toUIDate } = useTranslationWithUtils();

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'h-9 justify-start p-0 text-left font-normal',
              !calendarProps.selected && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="text-primary mr-2 size-6" />
            {calendarProps.selected ? (
              toUIDate(calendarProps.selected, { useToday: true })
            ) : (
              <span>{t('expense_details.add_expense_details.pick_a_date')}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar fixedWeeks {...calendarProps} />
        </PopoverContent>
      </Popover>
    </div>
  );
};
