import React from 'react';
import { Command, CommandGroup, CommandItem } from '../ui/command';
import { AppDrawer } from '../ui/drawer';
import { Check, ChevronRight, Moon } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '../ui/button';
import { useTheme } from 'next-themes';

const supportedThemes = {
  dark: 'Dark',
  light: 'Light',
  system: 'System prefer',
};

export const ThemeSelect = () => {
  const [open, setOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();

  const onSelect = async (currentValue: string) => {
    setTheme(currentValue);

    setOpen(false);
  };

  return (
    <AppDrawer
      trigger={
        <Button
          variant="ghost"
          className="text-md w-full justify-between px-0 hover:text-foreground/80"
        >
          <div className="flex items-center gap-4">
            <Moon className="h-5 w-5 text-violet-500" />
            <p>Theme</p>
          </div>
          <ChevronRight className="h-6 w-6 text-gray-500" />
        </Button>
      }
      onTriggerClick={() => setOpen(true)}
      title={'Select theme'}
      className="h-[70vh]"
      shouldCloseOnAction
      open={open}
      onOpenChange={(openVal) => {
        if (openVal !== open) setOpen(openVal);
      }}
    >
      <div className="">
        <Command className="h-[50vh]">
          <CommandGroup className="h-full overflow-auto">
            {Object.keys(supportedThemes).map((framework, index) => (
              <CommandItem
                key={framework}
                value={framework}
                onSelect={(currentValue) => onSelect(currentValue)}
              >
                <Check
                  className={cn('mr-2 h-4 w-4', framework === theme ? 'opacity-100' : 'opacity-0')}
                />
                <div className="flex gap-2">
                  <p>{Object.values(supportedThemes)[index]}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </div>
    </AppDrawer>
  );
};
