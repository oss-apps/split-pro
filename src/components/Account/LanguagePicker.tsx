import { ChevronRight, Languages } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { api } from '~/utils/api';
import { getSupportedLanguages } from '~/utils/i18n/client';
import { GeneralPicker } from '../ui/picker';

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

  const extractValue = useCallback((language: { code: string }) => language.code, []);
  const extractKey = useCallback((language: { code: string }) => language.code, []);
  const selected = useCallback(
    (language: { code: string }) => i18n.language === language.code,
    [i18n.language],
  );
  const render = useCallback((language: { name: string }) => <p>{language.name}</p>, []);

  return (
    <GeneralPicker
      trigger={trigger}
      title={t('ui.change_language_details.title')}
      placeholderText={t('ui.change_language_details.placeholder')}
      noOptionsText={t('ui.change_language_details.no_currency_found')}
      onSelect={onSelect}
      items={supportedLanguages}
      extractValue={extractValue}
      extractKey={extractKey}
      selected={selected}
      render={render}
    />
  );
};
