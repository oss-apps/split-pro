import { useSyncExternalStore } from 'react';

const getSnapshot = (): boolean => {
  try {
    const isIOSStandalone =
      typeof navigator !== 'undefined' && 'standalone' in navigator
        ? !!navigator.standalone
        : false;

    const isDisplayModeStandalone =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)').matches
        : false;

    return isIOSStandalone || isDisplayModeStandalone;
  } catch {
    return false;
  }
};

const subscribe = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', callback);
    return () => mediaQuery.removeEventListener('change', callback);
  }

  mediaQuery.addListener(callback);
  return () => mediaQuery.removeListener(callback);
};

export function useIsPwa(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
