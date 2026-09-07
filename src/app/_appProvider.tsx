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
 *
 * BUG FIX : La version précédente avait une boucle infinie car `initialize` était
 * un useCallback qui dépendait de `language` (qui change à l'init), ce qui
 * redéclenchait initialize. On utilise maintenant un ref pour exécuter initialize
 * une seule fois.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Network from 'expo-network';
import * as SplashScreen from 'expo-splash-screen';

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
  const [error, setError] = useState<MoneyZenError | Error | null>(null);

  const setDbReady = useAppStore((s) => s.setDbReady);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  const setOnline = useAppStore((s) => s.setOnline);

  const loadSettings = useSettingsStore((s) => s.load);

  // Ref pour empêcher la double-exécution de initialize()
  const hasInitializedRef = useRef(false);
  const isInitializingRef = useRef(false);

  const initialize = useCallback(async () => {
    // Guard : n'exécuter qu'une seule fois
    if (hasInitializedRef.current || isInitializingRef.current) {
      console.info('[AppProvider] initialize() skipped (already done or in progress)');
      return;
    }
    isInitializingRef.current = true;

    try {
      console.info('[AppProvider] ====== INITIALISATION START ======');
      setStatus('loading');
      setError(null);

      // 1. SQLite + migrations
      console.info('[AppProvider] 1. Ouverture SQLite...');
      getDatabase();
      console.info('[AppProvider] 2. Exécution des migrations...');
      const migrationResult = runMigrations();
      console.info('[AppProvider] Migrations OK:', migrationResult);

      // 2. Charge les settings (ou crée les valeurs par défaut)
      console.info('[AppProvider] 3. Chargement des settings...');
      await loadSettings();
      const currentSettings = useSettingsStore.getState().settings;
      console.info('[AppProvider] Settings loaded:', {
        language: currentSettings.language,
        baseCurrency: currentSettings.baseCurrency,
        themePreference: currentSettings.themePreference,
        isOnboardingComplete: currentSettings.isOnboardingComplete,
        isDemoMode: currentSettings.isDemoMode,
      });

      // 3. Applique la langue
      console.info('[AppProvider] 4. Application de la langue:', currentSettings.language);
      setAppLanguage(currentSettings.language);

      // 4. Si migrations viennent d'être créées (= premier lancement), seede
      if (migrationResult.applied.length > 0) {
        console.info('[AppProvider] 5. Seed des devises par défaut...');
        seedDefaultCurrencies();
        console.info('[AppProvider] 6. Seed des catégories par défaut...');
        seedDefaultCategories();
      } else {
        console.info('[AppProvider] 5/6. Skip seed (migrations déjà appliquées)');
      }

      // 5. Mode démo (env var en dev uniquement)
      if (process.env.EXPO_PUBLIC_DEMO_MODE === 'true' && !currentSettings.isDemoMode) {
        console.info('[AppProvider] 7. Seed des données démo...');
        try {
          seedDemoData();
          setDemoMode(true);
          useSettingsStore.getState().setDemoMode(true);
        } catch (demoErr) {
          console.warn('[AppProvider] seedDemoData failed (non-blocking):', demoErr);
        }
      }

      console.info('[AppProvider] 8. setDbReady(true)');
      setDbReady(true);
      setStatus('ready');
      hasInitializedRef.current = true;
      console.info('[AppProvider] ====== INITIALISATION DONE ======');
    } catch (e) {
      console.error('[AppProvider] ====== INITIALISATION FAILED ======', e);
      const mzError =
        e instanceof MoneyZenError ? e : new Error('Erreur d\'initialisation', { cause: e as Error });
      setError(mzError);
      setStatus('error');
    } finally {
      isInitializingRef.current = false;
      // CACHE LE SPLASH SCREEN dans tous les cas (prêt ou erreur)
      try {
        console.info('[AppProvider] Hiding splash screen...');
        SplashScreen.hideAsync();
      } catch (e) {
        console.warn('[AppProvider] hideAsync failed:', e);
      }
    }
  }, [loadSettings, setDbReady, setDemoMode]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Écoute l'état réseau (online/offline) pour l'indicateur UI.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const state = await Network.getNetworkStateAsync();
        if (!cancelled) {
          setOnline(state.isInternetReachable === true);
        }
      } catch (e) {
        console.warn('[AppProvider] Network check failed:', e);
        if (!cancelled) setOnline(true); // assume online par défaut
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
      console.info('[AppProvider] AppState:', nextState);
    });
    return () => sub.remove();
  }, []);

  // États UI
  if (status === 'loading' || status === 'pending') {
    // Pendant l'init, on affiche null (le splash natif reste visible)
    return null;
  }

  if (status === 'error') {
    // Écran d'erreur visible (au lieu de null comme avant)
    return (
      <ErrorInitScreen error={error} onRetry={() => {
        hasInitializedRef.current = false;
        isInitializingRef.current = false;
        void initialize();
      }} />
    );
  }

  // status === 'ready'
  return <>{children}</>;
}

// ─── Écran d'erreur d'initialisation ────────────────────────────────────────
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

function ErrorInitScreen({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>Money-zen — Erreur d'initialisation</Text>
      </View>
      <ScrollView style={styles.scroll}>
        <Text style={styles.errorText}>{error?.message ?? 'Erreur inconnue'}</Text>
        {error?.stack ? (
          <Text style={styles.stack}>{error.stack}</Text>
        ) : null}
      </ScrollView>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF7F0',
    padding: 20,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emoji: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#3D332B', textAlign: 'center' },
  scroll: {
    flex: 1,
    backgroundColor: '#FFF8EC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B4F3C',
    marginBottom: 12,
  },
  stack: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#5C4F44',
  },
  retryButton: {
    backgroundColor: '#B5533C',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryText: { color: '#FBF7F0', fontWeight: '600', fontSize: 15 },
});
