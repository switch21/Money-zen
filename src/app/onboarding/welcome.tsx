/**
 * Money-zen — Écran Onboarding Welcome (spec section 9).
 */
import { View, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';

export default function OnboardingWelcome() {
  const { tokens, spacing } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: tokens.background, padding: spacing[6] }]}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Text variant="h1" color="brand">
            🪙
          </Text>
        </View>
        <View style={{ marginTop: spacing[6] }}>
          <Text variant="h2" align="center" style={{ marginBottom: spacing[3] }}>
            Money-zen
          </Text>
          <Text variant="body" color="textSecondary" align="center" style={{ paddingHorizontal: spacing[6] }}>
            Gérez votre argent simplement, même avec plusieurs devises.
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Button variant="primary" size="lg" fullWidth onPress={() => router.push('/onboarding/currency')}>
          Commencer
        </Button>
        <View style={{ marginTop: spacing[4] }}>
          <Text variant="caption" color="textTertiary" align="center">
            Simple · Intuitive · Multidevise · Hors ligne
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(201,112,72,0.12)', justifyContent: 'center', alignItems: 'center' },
  footer: { paddingBottom: 32 },
});
