import React, { useCallback } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { AppDrawer } from '../ui/drawer';
import { Check, ChevronRight, Landmark } from 'lucide-react';
import { cn } from '~/lib/utils';
import { api } from '~/utils/api';
import { Button } from '../ui/button';
import Image from 'next/image';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';

export const BankAccountSelect = ({
  bankConnectionEnabled,
}: {
  bankConnectionEnabled: boolean;
}) => {
  const { t } = useTranslationWithUtils(['account_page']);

  const userQuery = api.user.me.useQuery();
  const updateProfile = api.user.updateUserDetail.useMutation();
  const institutions = api.gocardless.getInstitutions.useQuery();

  if (!bankConnectionEnabled) {
    return null;
  }

  const onSelect = useCallback(
    async (currentValue: string) => {
      await updateProfile.mutateAsync({ bankingId: currentValue.toUpperCase() });
      userQuery.refetch().catch((err) => console.error(err));
    },
    [updateProfile, userQuery],
  );

  return (
    <AppDrawer
      trigger={
        <Button
          variant="ghost"
          className="text-md hover:text-foreground/80 w-full justify-between px-0"
        >
          <div className="flex items-center gap-4">
            <Landmark className="h-5 w-5 text-blue-500" />
            <p>{t('ui.choose_bank_provider')}</p>
          </div>
          <ChevronRight className="h-6 w-6 text-gray-500" />
        </Button>
      }
      title={t('ui.select_bank_provider')}
      className="h-[70vh]"
    >
      <Command className="h-[50vh]">
        <CommandInput className="text-lg" placeholder={t('ui.search_bank')} />
        <CommandEmpty>{t('ui.no_bank_providers_found')}</CommandEmpty>
        <CommandGroup className="h-full overflow-auto">
          {institutions?.data?.map((framework) => (
            <CommandItem key={framework.id} value={framework.id} onSelect={onSelect}>
              <Check
                className={cn(
                  'mr-2 h-4 w-4',
                  framework.id === userQuery.data?.bankingId ? 'opacity-100' : 'opacity-0',
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
    </AppDrawer>
  );
};
