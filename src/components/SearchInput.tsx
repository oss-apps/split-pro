import { Search, X } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import React from 'react';

import { Input } from '~/components/ui/input';

/**
 * Search box with a clear button, meant to be paired with the `useSearch` hook.
 */
export const SearchInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className }) => {
  const { t } = useTranslation();

  return (
    <Input
      type="text"
      enterKeyHint="search"
      maxLength={100}
      value={value}
      onChange={(ev) => onChange(ev.target.value)}
      placeholder={placeholder ?? t('ui.search_expenses_placeholder')}
      className={className}
      rightIcon={
        value ? (
          <button
            type="button"
            className="flex items-center"
            onClick={() => onChange('')}
            aria-label={t('ui.clear_search')}
          >
            <X className="text-muted-foreground size-4" />
          </button>
        ) : (
          <Search className="text-muted-foreground size-4" />
        )
      }
    />
  );
};
