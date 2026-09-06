/**
 * Money-zen — Route racine (placeholder pendant l'init + redirect automatique).
 * Le routing est géré par _layout.tsx via useEffect → router.replace.
 */
import { View, ActivityIndicator } from 'react-native';

import { useTheme } from '@theme/ThemeProvider';
import { useAppStore } from '@stores/appStore';
import { useSettingsStore } from '@stores/settingsStore';

export default function RootIndex() {
  const { tokens } = useTheme();
  const isDbReady = useAppStore((s) => s.isDbReady);
  const isOnboardingComplete = useSettingsStore((s) => s.settings.isOnboardingComplete);

  // Le redirect est géré par _layout.tsx. Ici on ne fait qu'afficher un loader.
  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={tokens.brand} />
    </View>
  );
}
