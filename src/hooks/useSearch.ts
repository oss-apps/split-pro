import { useEffect, useState } from 'react';

/**
 * State for a search box that drives a backend query.
 * @param delay Debounce delay in milliseconds before the typed text is used as the query.
 * @returns The raw input `value` and its setter, plus the debounced, trimmed `search`
 * (undefined when empty) to pass to the query input.
 */
export const useSearch = (delay = 300) => {
  const [value, setValue] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim()), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  // Clearing the box restores the full list right away, without waiting for the debounce.
  const search = value.trim() && debounced ? debounced : undefined;

  return { value, setValue, search };
};
