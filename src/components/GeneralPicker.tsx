import { Check } from 'lucide-react';
import React from 'react';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './ui/command';
import { AppDrawer, DrawerClose } from '~/components/ui/drawer';
import { cn } from '~/lib/utils';

export const GeneralPicker: React.FC<{
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
}) => (
  <AppDrawer trigger={trigger} title={title} className="h-[70vh]" shouldCloseOnAction>
    <Command className="h-[50vh]">
      <CommandInput className="text-lg" placeholder={placeholderText} />
      <CommandList>
        <CommandEmpty>{noOptionsText}</CommandEmpty>
        {items.map((item) => (
          <CommandItem key={extractKey(item)} value={extractValue(item)} onSelect={onSelect}>
            <DrawerClose className="flex items-center">
              <Check className={cn('mr-2 h-4 w-4', selected(item) ? 'opacity-100' : 'opacity-0')} />
              <div className="flex gap-2">{render(item)}</div>
            </DrawerClose>
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  </AppDrawer>
);
