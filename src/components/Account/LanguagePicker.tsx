import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React, { type PropsWithChildren, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { api } from '~/utils/api';
import { getSupportedLanguages } from '~/utils/i18n/client';
import { GeneralPicker } from '../GeneralPicker';

export const LanguagePicker: React.FC<PropsWithChildren> = ({ children }) => {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const updateUser = api.user.updateUserDetail.useMutation();

  const supportedLanguages = useMemo(getSupportedLanguages, []);

  const onSelect = useCallback(
    async (currentValue: string) => {
      try {
        await updateUser.mutateAsync({
          preferredLanguage: currentValue,
        });

        router.reload();

        toast.success(t('account.change_language_details.messages.language_changed'), {
          duration: 1500,
        });
      } catch (error) {
        console.error('Error changing language:', error);
        toast.error(t('errors.language_change_failed'));
      }
    },
    [router, t, updateUser],
  );

  const extractKey = useCallback((language: { code: string }) => language.code, []);
  const selected = useCallback(
    (language: { code: string }) => i18n.language === language.code,
    [i18n.language],
  );
  const render = useCallback((language: { name: string }) => <p>{language.name}</p>, []);

  return (
    <GeneralPicker
      trigger={children}
      title={t('account.change_language_details.title')}
      placeholderText={t('account.change_language_details.placeholder')}
      noOptionsText={t('account.change_language_details.no_currency_found')}
      onSelect={onSelect}
      items={supportedLanguages}
      extractValue={extractKey}
      extractKey={extractKey}
      selected={selected}
      render={render}
    />
  );
};
