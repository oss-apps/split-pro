import { Check, ChevronRight, Languages } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../ui/command';
import { api } from '~/utils/api';
import { getSupportedLanguages } from '~/utils/i18n/client';
import { cn } from '~/lib/utils';
import { AppDrawer, DrawerClose } from '~/components/ui/drawer';

export const LanguagePicker: React.FC = () => {
  const router = useRouter();
  const { i18n, t } = useTranslation('account_page');
  const updateUser = api.user.updateUserDetail.useMutation();

  const supportedLanguages = useMemo(getSupportedLanguages, []);

  const onSelect = useCallback(
    async (currentValue: string) => {
      try {
        await updateUser.mutateAsync({
          preferredLanguage: currentValue,
        });

        await router.push(router.asPath, router.asPath, {
          locale: currentValue,
          scroll: false,
        });

        toast.success(t('ui.change_language_details.messages.language_changed'), {
          duration: 1500,
        });
      } catch (error) {
        console.error('Error changing language:', error);
        toast.error(t('ui.change_language_details.errors.language_change_failed'));
      }
    },
    [router, t, updateUser],
  );

  const trigger = useMemo(
    () => (
      <div className="hover:text-foreground/80 flex w-full justify-between px-0 py-2 text-[16px] font-medium text-gray-300">
        <div className="flex items-center gap-4">
          <Languages className="h-5 w-5 text-green-500" />
          {t('ui.change_language')}
        </div>
        <ChevronRight className="h-6 w-6 text-gray-500" />
      </div>
    ),
    [t],
  );

  return (
    <AppDrawer
      trigger={trigger}
      leftAction={t('ui.change_language_details.close')}
      title={t('ui.change_language_details.title')}
      className="h-[40vh]"
      shouldCloseOnAction
    >
      <Command className="h-[50vh]">
        <CommandInput
          className="text-lg"
          placeholder={t('ui.change_language_details.placeholder')}
        />
        <CommandList>
          <CommandEmpty>{t('ui.change_language_details.no_language_found')}</CommandEmpty>
          {supportedLanguages.map((language) => (
            <CommandItem key={language.code} value={language.code} onSelect={onSelect}>
              <DrawerClose className="flex items-center">
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    i18n.language === language.code ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <div className="flex gap-2">
                  <p>{language.name}</p>
                </div>
              </DrawerClose>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </AppDrawer>
  );
};
