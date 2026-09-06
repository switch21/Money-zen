/**
 * Money-zen — Layout racine (Expo Router).
 * - Active Splash screen natif pendant l'init.
 * - Enrobe l'app avec ThemeProvider + AppProvider.
 * - Détecte si onboarding nécessaire → redirige vers /onboarding.
 * - Sinon → redirige vers /(tabs).
 */
import { Stack, useSegments, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { ThemeProvider } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/settingsStore';
import { useAppStore } from '@stores/appStore';
import { AppProvider } from './_appProvider';
import { setAppLanguage } from '@i18n/index';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // On utilise 'system' par défaut. La vraie préférence (chargée par AppProvider)
  // est répercutée via `RootGate` qui re-render ThemeProvider quand settings change.
  const themePreference = useSettingsStore((s) => s.settings.themePreference);
  return (
    <ThemeProvider preference={themePreference}>
      <RootGate />
    </ThemeProvider>
  );
}

function RootGate() {
  const segments = useSegments();
  const router = useRouter();
  const language = useSettingsStore((s) => s.settings.language);
  const isOnboardingComplete = useSettingsStore((s) => s.settings.isOnboardingComplete);
  const isDbReady = useAppStore((s) => s.isDbReady);

  // Applique la langue à chaque changement.
  useEffect(() => {
    setAppLanguage(language);
  }, [language]);

  // Routing selon état d'init.
  useEffect(() => {
    if (!isDbReady) return; // attendre init
    SplashScreen.hideAsync();

    const inOnboardingGroup = segments[0] === 'onboarding';
    if (!isOnboardingComplete && !inOnboardingGroup) {
      router.replace('/onboarding/welcome');
    } else if (isOnboardingComplete && inOnboardingGroup) {
      router.replace('/(tabs)');
    }
  }, [isDbReady, isOnboardingComplete, segments, router]);

  return (
    <>
      <AppProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      </AppProvider>
      <StatusBar style="auto" />
    </>
  );
}
