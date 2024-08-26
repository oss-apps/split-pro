import { create } from 'zustand';

interface AppState {
  webPushPublicKey: string | null;
  actions: {
    setWebPushPublicKey: (key: string) => void;
  };
}

export const useAppStore = create<AppState>()((set) => ({
  webPushPublicKey: null,
  actions: {
    setWebPushPublicKey: (key) => set({ webPushPublicKey: key }),
  },
}));
