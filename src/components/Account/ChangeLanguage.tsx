import React, { useState, useEffect } from 'react';
import { AppDrawer } from '../ui/drawer';
import { ChevronRight, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '~/utils/api';
import {z} from "zod"; // Importa l'API di tRPC

export const ChangeLanguage: React.FC = () => {
    const updatePreferredLanguage = api.user.updatePreferredLanguage.useMutation();
    const { t, i18n } = useTranslation(['account_page', 'language']);
    const [languageOpen, setLanguageOpen] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState<string>(i18n.language); // Lingua selezionata
    const [initialLanguage, setInitialLanguage] = useState<string>(i18n.language); // Lingua iniziale (al momento dell'apertura del drawer)

    // Ottieni le lingue supportate dalla configurazione di i18next e filtra "cimode"
    const supportedLanguages: string[] = (
        (i18n.options.supportedLngs as string[] || ['en', 'it'])
    ).filter((languageCode) => languageCode !== 'cimode');

    // Funzione per ottenere il nome della lingua dal file di traduzione
    const getLanguageName = (languageCode: string): string => {
        return t(`language:ui/languages/${languageCode}`) || languageCode;
    };

    // Ripristina la lingua selezionata al momento dell'apertura del drawer
    const handleClose = () => {
        setSelectedLanguage(initialLanguage); // Ripristina la lingua iniziale
        setLanguageOpen(false); // Chiudi il drawer
    };

    // Aggiorna la lingua iniziale quando il drawer viene aperto
    useEffect(() => {
        if (languageOpen) {
            setInitialLanguage(i18n.language); // Imposta la lingua iniziale
            setSelectedLanguage(i18n.language); // Imposta la lingua selezionata
        }
    }, [languageOpen, i18n.language]);

    async function confirmLanguageChange() {
        if (selectedLanguage) {
            try {
                await i18n.changeLanguage(selectedLanguage);
                await updatePreferredLanguage.mutateAsync({ language: selectedLanguage });

                toast.success(t('language:messages/language_changed'));
            } catch (e) {
                toast.error(t('language:messages/language_change_failed'));}
        }
        setLanguageOpen(false);
    }

    return (
        <AppDrawer
            trigger={
                <div className="flex w-full justify-between px-0 py-2 text-[16px] font-medium text-gray-300 hover:text-foreground/80">
                    <div className="flex items-center gap-4 text-[16px]">
                        <Globe className="h-5 w-5 text-blue-500" />
                        {t('account_page:ui/select_language')}
                    </div>
                    <ChevronRight className="h-6 w-6 text-gray-500" />
                </div>
            }
            open={languageOpen}
            onOpenChange={setLanguageOpen}
            onClose={handleClose} // Usa handleClose per gestire la chiusura
            leftAction={t('language:ui/close')}
            title={t('language:ui/title')}
            className="h-[70vh]"
            shouldCloseOnAction={false}
            actionTitle={t('language:ui/confirm')} // Pulsante di conferma
            actionOnClick={confirmLanguageChange} // Azione al clic su "Conferma"
        >
            <div className="mt-4 flex flex-col gap-2">
                {supportedLanguages.map((languageCode: string) => (
                    <button
                        key={languageCode}
                        className={`flex items-center justify-between rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            selectedLanguage === languageCode ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                        onClick={() => setSelectedLanguage(languageCode)} // Imposta la lingua selezionata
                    >
                        <span>{getLanguageName(languageCode)}</span>
                        {selectedLanguage === languageCode && (
                            <span className="text-sm text-green-500">✓</span> // Mostra un segno di spunta per la lingua selezionata
                        )}
                    </button>
                ))}
            </div>
        </AppDrawer>
    );
};