/**
 * Money-zen — AppProvider : orchestration de l'initialisation au démarrage.
 *
 * Au premier lancement :
 *   1. Ouvre la base SQLite.
 *   2. Exécute les migrations.
 *   3. Charge les paramètres utilisateur (singleton).
 *   4. Si premier lancement → seede devises + catégories par défaut.
 *   5. Configure la langue et le thème.
 *   6. Marque l'app comme prête.
 *
 * En mode démo (EXPO_PUBLIC_DEMO_MODE=true) → seede aussi des données démo.
 */
import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Network from 'expo-network';

import { getDatabase } from '@database/sqlite';
import { runMigrations } from '@database/migrations';
import { useAppStore } from '@stores/appStore';
import { useSettingsStore } from '@stores/settingsStore';
import { seedDefaultCurrencies } from '@database/repositories/currencyRepository';
import { seedDefaultCategories } from '@database/repositories/categoryRepository';
import { seedDemoData } from '@database/demoData';
import { setAppLanguage } from '@i18n/index';
import { MoneyZenError } from '@types/index';

interface AppProviderProps {
  children: React.ReactNode;
}

type InitStatus = 'pending' | 'loading' | 'ready' | 'error';

export function AppProvider({ children }: AppProviderProps) {
  const [status, setStatus] = useState<InitStatus>('pending');
  const [error, setError] = useState<MoneyZenError | null>(null);

  const setDbReady = useAppStore((s) => s.setDbReady);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  const setOnline = useAppStore((s) => s.setOnline);
  const setLastSyncedAt = useAppStore((s) => s.setLastSyncedAt);

  const loadSettings = useSettingsStore((s) => s.load);
  const language = useSettingsStore((s) => s.settings.language);
  const isDemoMode = useSettingsStore((s) => s.settings.isDemoMode);

  const initialize = useCallback(async () => {
    try {
      setStatus('loading');
      setError(null);

      // 1. SQLite + migrations
      getDatabase();
      const migrationResult = runMigrations();
      console.info('[AppProvider] Migrations:', migrationResult);

      // 2. Charge les settings (ou crée les valeurs par défaut)
      await loadSettings();

      // 3. Applique la langue
      setAppLanguage(language);

      // 4. Si migrations viennent d'être créées (= premier lancement), seede
      if (migrationResult.applied.length > 0) {
        await seedDefaultCurrencies();
        await seedDefaultCategories();
      }

      // 5. Mode démo (env var en dev uniquement)
      if (process.env.EXPO_PUBLIC_DEMO_MODE === 'true' && !isDemoMode) {
        await seedDemoData();
        setDemoMode(true);
      }

      setDbReady(true);
      setStatus('ready');
    } catch (e) {
      const mzError =
        e instanceof MoneyZenError ? e : new MoneyZenError('UNKNOWN', 'Erreur d\'initialisation', e as Error);
      setError(mzError);
      setStatus('error');
      console.error('[AppProvider] Init failed:', mzError);
    }
  }, [loadSettings, language, isDemoMode, setDbReady, setDemoMode]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Écoute l'état réseau (online/offline) pour l'indicateur UI.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      const state = await Network.getNetworkStateAsync();
      if (!cancelled) {
        setOnline(state.isInternetReachable === true);
      }
    }
    void check();
    const interval = setInterval(check, 30_000); // poll toutes les 30s
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [setOnline]);

  // Écoute AppState (background/active) pour auto-lock (Phase 11).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Auto-lock est géré par securityService (Phase 11).
      }
    });
    return () => sub.remove();
  }, []);

  if (status === 'loading' || status === 'pending') {
    return null; // Splash géré nativement par expo-splash-screen.
  }
  if (status === 'error') {
    // En production, on aimerait un écran d'erreur dédié. Pour V1, on log.
    return null;
  }
  return <>{children}</>;
}
