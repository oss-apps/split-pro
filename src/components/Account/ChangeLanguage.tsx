import React, { useState, useEffect } from 'react';
import { AppDrawer } from '../ui/drawer';
import { ChevronRight, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '~/utils/api';

export const ChangeLanguage: React.FC = () => {
    const updatePreferredLanguage = api.user.updatePreferredLanguage.useMutation();
    const { t, i18n } = useTranslation('account_page');
    const [languageOpen, setLanguageOpen] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState<string>(i18n.language); // Selected language
    const [initialLanguage, setInitialLanguage] = useState<string>(i18n.language); // Initial language (when opening the drawer)

    // Get supported languages ​​from i18next configuration and filter "cimode"
    const supportedLanguages: string[] = (
        (i18n.options.supportedLngs as string[] || ['en', 'it'])
    ).filter((languageCode) => languageCode !== 'cimode');

    // Function to get language name from translation file
    const getLanguageName = (languageCode: string): string => {
        return t(`ui/change_language_details/languages/${languageCode}`) || languageCode;
    };

    // Restores the language selected when opening the drawer
    const handleClose = () => {
        setSelectedLanguage(initialLanguage); // Ripristina la lingua iniziale
        setLanguageOpen(false); // Chiudi il drawer
    };

    // Update the initial language when the drawer is opened
    useEffect(() => {
        if (languageOpen) {
            setInitialLanguage(i18n.language); // Set the initial language
            setSelectedLanguage(i18n.language); // Set the selected language
        }
    }, [languageOpen, i18n.language]);

    async function confirmLanguageChange() {
        if (selectedLanguage) {
            try {
                await i18n.changeLanguage(selectedLanguage);
                await updatePreferredLanguage.mutateAsync({ language: selectedLanguage });

                toast.success(t('ui/change_language_details/messages/language_changed'));
            } catch (e) {
                toast.error(t('ui/change_language_details/messages/language_change_failed'));}
        }
        setLanguageOpen(false);
    }

    return (
        <AppDrawer
            trigger={
                <div className="flex w-full justify-between px-0 py-2 text-[16px] font-medium text-gray-300 hover:text-foreground/80">
                    <div className="flex items-center gap-4 text-[16px]">
                        <Globe className="h-5 w-5 text-blue-500" />
                        {t('ui/change_language')}
                    </div>
                    <ChevronRight className="h-6 w-6 text-gray-500" />
                </div>
            }
            open={languageOpen}
            onOpenChange={setLanguageOpen}
            onClose={handleClose}
            leftAction={t('ui/change_language_details/close')}
            title={t('ui/change_language_details/title')}
            className="h-[70vh]"
            shouldCloseOnAction={false}
            actionTitle={t('ui/change_language_details/save')}
            actionOnClick={confirmLanguageChange}
        >
            <div className="mt-4 flex flex-col gap-2">
                {supportedLanguages.map((languageCode: string) => (
                    <button
                        key={languageCode}
                        className={`flex items-center justify-between rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            selectedLanguage === languageCode ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                        onClick={() => setSelectedLanguage(languageCode)}
                    >
                        <span>{getLanguageName(languageCode)}</span>
                        {selectedLanguage === languageCode && (
                            <span className="text-sm text-green-500">✓</span>
                        )}
                    </button>
                ))}
            </div>
        </AppDrawer>
    );
};