import React, { useState, useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { Globe } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { getSupportedLanguages } from '~/utils/i18n';

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const supportedLanguages = useMemo(() => getSupportedLanguages(), []);

  const currentLanguage =
    supportedLanguages.find((lang) => lang.code === i18n.language) ?? supportedLanguages[0];

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await router.push(router.asPath, router.asPath, {
        locale: languageCode,
        scroll: false,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLanguage?.name}</span>
        <span className="sm:hidden">{currentLanguage?.code.toUpperCase()}</span>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute top-full right-0 z-20 mt-1 min-w-[120px] rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="py-1">
              {supportedLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    i18n.language === language.code
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {language.name}
                  {i18n.language === language.code && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
