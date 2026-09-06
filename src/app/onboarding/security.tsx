/**
 * Money-zen — Onboarding Security (PIN + biométrie optionnels, ignorable).
 * Spec section 9 étape 4 : peut être ignoré, configuré plus tard.
 *
 * Implémentation minimale : propose de configurer un PIN (renvoyé vers Phase 11 plus tard).
 * Pour V1 on "skip" en marquant l'onboarding complete, et le user peut configurer plus tard dans Paramètres.
 */
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/appStore';
import { useSettingsStore as useSettings } from '@stores/settingsStore';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';

export default function OnboardingSecurity() {
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const setOnboardingComplete = useSettings((s) => s.setOnboardingComplete);

  const handleSkip = () => {
    setOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.background, padding: spacing[6] }]}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text variant="h1" color="brand" style={{ marginBottom: spacing[4] }}>
          🔐
        </Text>
        <Text variant="h2" align="center" style={{ marginBottom: spacing[3] }}>
          Sécurisez vos données
        </Text>
        <Text variant="body" color="textSecondary" align="center" style={{ paddingHorizontal: spacing[8] }}>
          Protégez Money-zen par un PIN ou la biométrie. Cette étape peut être ignorée et configurée plus tard dans les réglages.
        </Text>
      </View>
      <View style={{ gap: spacing[3] }}>
        <Button variant="secondary" size="lg" fullWidth onPress={() => router.push('/onboarding/pin-setup')}>
          Configurer un PIN
        </Button>
        <Button variant="ghost" size="lg" fullWidth onPress={handleSkip}>
          Plus tard
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
