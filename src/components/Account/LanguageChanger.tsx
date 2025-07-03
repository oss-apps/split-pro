import { ChevronRight, Languages } from 'lucide-react';
import React, { useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

import { api } from '~/utils/api';
import { getSupportedLanguages } from '~/utils/i18n/client';
import { Button } from '~/components/ui/button';
import { AppDrawer } from '~/components/ui/drawer';

export const LanguageChanger: React.FC = () => {
  const router = useRouter();
  const { i18n, t } = useTranslation('account_page');
  const updateUser = api.user.updateUserDetail.useMutation();

  const supportedLanguages = useMemo(getSupportedLanguages, []);

  const handleLanguageChange = React.useCallback(
    async (languageCode: string) => {
      try {
        await updateUser.mutateAsync({
          preferredLanguage: languageCode,
        });

        await router.push(router.asPath, router.asPath, {
          locale: languageCode,
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

  return (
    <AppDrawer
      trigger={
        <div className="hover:text-foreground/80 flex w-full justify-between px-0 py-2 text-[16px] font-medium text-gray-300">
          <div className="flex items-center gap-4">
            <Languages className="h-5 w-5 text-green-500" />
            {t('ui.change_language')}
          </div>
          <ChevronRight className="h-6 w-6 text-gray-500" />
        </div>
      }
      leftAction={t('ui.change_language_details.close')}
      title={t('ui.change_language_details.title')}
      className="h-[40vh]"
      shouldCloseOnAction
    >
      <div className="flex flex-col gap-4">
        {supportedLanguages.map((language) => (
          <Button
            key={language.code}
            variant={i18n.language === language.code ? 'secondary' : 'outline'}
            onClick={() => handleLanguageChange(language.code)}
            className="w-full justify-start"
          >
            {language.name}
            {i18n.language === language.code && <span className="ml-2">✓</span>}
          </Button>
        ))}
      </div>
    </AppDrawer>
  );
};
