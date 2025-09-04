import { useEffect, useState } from 'react';

export function useIsPwa(): boolean {
  const [isPwa, setIsPwa] = useState(false);

  useEffect(() => {
    try {
      const isIOSStandalone =
        typeof navigator !== 'undefined' && 'standalone' in navigator
          ? !!navigator.standalone
          : false;

      const isDisplayModeStandalone =
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
          ? window.matchMedia('(display-mode: standalone)').matches
          : false;

      setIsPwa(isIOSStandalone || isDisplayModeStandalone);
    } catch {
      setIsPwa(false);
    }
  }, []);

  return isPwa;
}
