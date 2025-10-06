import React, { useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { useAddExpenseStore } from '~/store/addStore';
import { AppDrawer } from '../ui/drawer';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export const RecurrenceInput: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { t } = useTranslation();
  const { setRepeatInterval, setRepeatEvery, unsetRepeat } = useAddExpenseStore((s) => s.actions);
  const repeatInterval = useAddExpenseStore((s) => s.repeatInterval);
  const repeatEvery = useAddExpenseStore((s) => s.repeatEvery);

  const toggleRecurring = useCallback(() => {
    if (repeatInterval) {
      unsetRepeat();
    } else {
      setRepeatInterval('MONTHLY');
    }
  }, [repeatInterval, setRepeatInterval, unsetRepeat]);

  const onRepeatEveryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.min(99, Math.max(1, Number(e.target.value)));
      if (!Number.isNaN(val)) {
        setRepeatEvery(val);
      }
    },
    [setRepeatEvery],
  );

  return (
    <AppDrawer trigger={children} className="flex flex-col gap-2">
      <Label className="text-xs text-gray-500">Repeat every</Label>
      <div className="flex items-center gap-2 text-sm">
        <Input
          type="number"
          min={1}
          value={repeatEvery}
          max={99}
          className="h-9 w-10 text-center"
          onChange={onRepeatEveryChange}
        />
        <Select value={repeatInterval} onValueChange={setRepeatInterval}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder={repeatInterval} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="DAILY">Days</SelectItem>
              <SelectItem value="WEEKLY">Weeks</SelectItem>
              <SelectItem value="MONTHLY">Months</SelectItem>
              <SelectItem value="YEARLY">Years</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </AppDrawer>
  );
};
