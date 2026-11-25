import { useSyncExternalStore } from 'react';

const unsubscribe = () => {};
const subscribe = () => unsubscribe;
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export const useIsClient = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
