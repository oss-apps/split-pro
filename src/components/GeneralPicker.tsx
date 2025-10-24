import { Check } from 'lucide-react';
import React, { useCallback } from 'react';
import { AppDrawer } from '~/components/ui/drawer';
import { cn } from '~/lib/utils';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './ui/command';

export const GeneralPicker: React.FC<{
  className?: string;
  trigger: React.ReactNode;
  onSelect: (value: string) => void;
  items: any[];
  extractValue: (item: any) => string;
  extractKey: (item: any) => string;
  selected: (item: any) => boolean;
  render: (item: any) => React.ReactNode;
  placeholderText: string;
  noOptionsText: string;
  title: string;
}> = ({
  className,
  trigger,
  onSelect,
  items,
  extractValue,
  extractKey,
  render,
  placeholderText,
  noOptionsText,
  title,
  selected,
}) => {
  const [open, setOpen] = React.useState(false);

  const onSelectAndClose: typeof onSelect = useCallback(
    (value) => {
      setOpen(false);
      onSelect(value);
    },
    [onSelect],
  );

  return (
    <AppDrawer
      trigger={trigger}
      title={title}
      open={open}
      onOpenChange={setOpen}
      className={cn('h-[70vh]', className)}
      shouldCloseOnAction
    >
      <Command className="h-[50vh]">
        <CommandInput className="text-lg" placeholder={placeholderText} />
        <CommandList>
          <CommandEmpty>{noOptionsText}</CommandEmpty>
          {items.map((item) => (
            <CommandItem
              key={extractKey(item)}
              value={extractValue(item)}
              onSelect={onSelectAndClose}
              className="flex cursor-pointer items-center"
            >
              <Check className={cn('mr-2 h-4 w-4', selected(item) ? 'opacity-100' : 'opacity-0')} />
              <div className="flex gap-2">{render(item)}</div>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </AppDrawer>
  );
};
