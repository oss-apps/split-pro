'use client';

import { useCallback, useEffect, useState } from 'react';

export const useSession = (key: string): [string, (value: string) => void] => {
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    const storedValue = sessionStorage.getItem(key);
    console.log('storedValue:', storedValue);
    if (storedValue) {
      setValue(storedValue);
    }
  }, [key]);

  const setSessionValue = useCallback(
    (newValue: string) => {
      setValue(newValue);
      sessionStorage.setItem(key, newValue);
    },
    [key],
  );

  return [value, setSessionValue];
};
