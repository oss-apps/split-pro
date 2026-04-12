import { create } from 'zustand';

interface AppState {
  webPushPublicKey: string | null;
  maxUploadFileSizeMB: number;
  actions: {
    setWebPushPublicKey: (key: string) => void;
    setMaxUploadFileSizeMB: (size: number) => void;
  };
}

export const useAppStore = create<AppState>()((set) => ({
  webPushPublicKey: null,
  maxUploadFileSizeMB: 10,
  actions: {
    setWebPushPublicKey: (key) => set({ webPushPublicKey: key }),
    setMaxUploadFileSizeMB: (size) => set({ maxUploadFileSizeMB: size }),
  },
}));
