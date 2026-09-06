/**
 * Money-zen — Store global app (Zustand).
 * Spec section 5 : "Zustand sert principalement à gérer l'état applicatif/UI."
 * Pas de logique métier ici — uniquement des flags et des actions simples.
 */
import { create } from 'zustand';

import type { ISODateString } from '@types/index';

interface AppState {
  isDbReady: boolean;
  isOnboardingComplete: boolean;
  isDemoMode: boolean;
  isLocked: boolean;
  lastSyncedAt: ISODateString | null;
  isOnline: boolean;
}

interface AppActions {
  setDbReady: (ready: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setDemoMode: (demo: boolean) => void;
  setLocked: (locked: boolean) => void;
  setLastSyncedAt: (date: ISODateString | null) => void;
  setOnline: (online: boolean) => void;
  reset: () => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>((set) => ({
  isDbReady: false,
  isOnboardingComplete: false,
  isDemoMode: false,
  isLocked: false,
  lastSyncedAt: null,
  isOnline: true,
  setDbReady: (ready) => set({ isDbReady: ready }),
  setOnboardingComplete: (complete) => set({ isOnboardingComplete: complete }),
  setDemoMode: (demo) => set({ isDemoMode: demo }),
  setLocked: (locked) => set({ isLocked: locked }),
  setLastSyncedAt: (date) => set({ lastSyncedAt: date }),
  setOnline: (online) => set({ isOnline: online }),
  reset: () => set({ isDbReady: false, isOnboardingComplete: false, isDemoMode: false, isLocked: false, lastSyncedAt: null, isOnline: true }),
}));
