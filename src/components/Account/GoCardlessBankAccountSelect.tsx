import React from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { AppDrawer } from '../ui/drawer';
import { Check, ChevronRight, Landmark } from 'lucide-react';
import { cn } from '~/lib/utils';
import { api } from '~/utils/api';
import { Button } from '../ui/button';
import Image from 'next/image';

export const GoCardlessBankAccountSelect = () => {
  const [open, setOpen] = React.useState(false);
  const userQuery = api.user.me.useQuery();
  const updateProfile = api.user.updateUserDetail.useMutation();
  const institutions = api.gocardless.getInstitutions.useQuery();
  const gocardlessEnabled = api.gocardless.gocardlessEnabled.useQuery();

  if (!gocardlessEnabled) {
    return <></>;
  }

  const onSelect = async (currentValue: string) => {
    await updateProfile.mutateAsync({ gocardlessBankId: currentValue.toUpperCase() });
    userQuery.refetch().catch((err) => console.log(err));

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
            <Landmark className="h-5 w-5 text-blue-500" />
            <p>Choose bank provider</p>
          </div>
          <ChevronRight className="h-6 w-6 text-gray-500" />
        </Button>
      }
      onTriggerClick={() => setOpen(true)}
      title="Select bank provider"
      className="h-[70vh]"
      shouldCloseOnAction
      open={open}
      onOpenChange={(openVal) => {
        if (openVal !== open) setOpen(openVal);
      }}
    >
      <div>
        <Command className="h-[50vh]">
          <CommandInput className="text-lg" placeholder="Search bank" />
          <CommandEmpty>No bank providers found.</CommandEmpty>
          <CommandGroup className="h-full overflow-auto">
            {institutions?.data?.map((framework) => (
              <CommandItem
                key={framework.id}
                value={framework.id}
                onSelect={(currentValue) => onSelect(currentValue)}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    framework.id === userQuery.data?.gocardlessBankId ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <div className="flex gap-2">
                  <Image
                    alt={framework.name}
                    src={framework.logo}
                    width={20}
                    height={20}
                    objectFit="contain"
                    className="rounded-sm"
                  />
                  <p>{framework.name}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </div>
    </AppDrawer>
  );
};
