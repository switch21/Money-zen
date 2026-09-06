/**
 * Money-zen — Store settings (cache UI des préférences utilisateur).
 * La source de vérité reste SQLite (settingsRepository); ce store agit comme cache réactif.
 */
import { create } from 'zustand';

import {
  ensureSettingsSingletonExists,
  loadUserSettings,
  saveUserSettings,
} from '@database/repositories/settingsRepository';
import type { UserSettings } from '@types/index';

const DEFAULT_SETTINGS: UserSettings = {
  baseCurrency: 'XAF',
  language: 'fr',
  themePreference: 'system',
  isDemoMode: false,
  isOnboardingComplete: false,
  lastSyncedAt: null,
  security: {
    isPinEnabled: false,
    pinHash: null,
    isBiometricEnabled: false,
    autoLockDelaySeconds: 0,
  },
  notifications: {
    enableReminder: true,
    enableBudgetWarning: true,
    enableBudgetOver: true,
    enableRecurring: true,
    enableGoalUpdates: true,
    enableWeeklySummary: true,
    reminderHour: 20,
  },
};

interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  loaded: boolean;
}

interface SettingsActions {
  load: () => Promise<void>;
  update: (patch: Partial<UserSettings>) => void;
  updateSecurity: (patch: Partial<UserSettings['security']>) => void;
  updateNotifications: (patch: Partial<UserSettings['notifications']>) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setBaseCurrency: (currency: UserSettings['baseCurrency']) => void;
  setLanguage: (lang: UserSettings['language']) => void;
  setTheme: (theme: UserSettings['themePreference']) => void;
  setDemoMode: (demo: boolean) => void;
  reset: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  loaded: false,

  load: async () => {
    set({ isLoading: true });
    try {
      ensureSettingsSingletonExists();
      const s = loadUserSettings() ?? DEFAULT_SETTINGS;
      set({ settings: s, loaded: true, isLoading: false });
    } catch (e) {
      console.error('settingsStore.load failed', e);
      set({ isLoading: false, loaded: true });
    }
  },

  update: (patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    saveUserSettings(next);
  },

  updateSecurity: (patch) => {
    const next: UserSettings = {
      ...get().settings,
      security: { ...get().settings.security, ...patch },
    };
    set({ settings: next });
    saveUserSettings(next);
  },

  updateNotifications: (patch) => {
    const next: UserSettings = {
      ...get().settings,
      notifications: { ...get().settings.notifications, ...patch },
    };
    set({ settings: next });
    saveUserSettings(next);
  },

  setOnboardingComplete: (complete) => get().update({ isOnboardingComplete: complete }),
  setBaseCurrency: (currency) => get().update({ baseCurrency: currency }),
  setLanguage: (lang) => get().update({ language: lang }),
  setTheme: (theme) => get().update({ themePreference: theme }),
  setDemoMode: (demo) => get().update({ isDemoMode: demo }),

  reset: () => set({ settings: DEFAULT_SETTINGS, loaded: false }),
}));
