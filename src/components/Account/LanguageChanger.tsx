import { ChevronRight, Languages } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

import { api } from '~/utils/api';
import { Button } from '~/components/ui/button';
import { AppDrawer } from '~/components/ui/drawer';

interface LanguageChangerProps {
  t: (key: string) => string;
}

export const LanguageChanger: React.FC<LanguageChangerProps> = ({ t }) => {
  const router = useRouter();
  const { i18n } = useTranslation();
  const updatePreferredLanguage = api.user.updatePreferredLanguage.useMutation();

  const supportedLanguages = [
    { code: 'en', name: 'English' },
    { code: 'it', name: 'Italiano' },
  ];

  const handleLanguageChange = async (languageCode: string) => {
    try {
      console.log('Changing language to:', languageCode);
      await updatePreferredLanguage.mutateAsync({
        language: languageCode,
      });

      await router.push(router.asPath, router.asPath, {
        locale: languageCode,
        scroll: false,
      });

      toast.success(t('ui.change_language_details.messages.language_changed'), { duration: 1500 });
    } catch (error) {
      console.error('Error changing language:', error);
      toast.error(t('ui.change_language_details.errors.language_change_failed'));
    }
  };

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
