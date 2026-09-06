/**
 * Money-zen — Onboarding PIN setup (Phase 11, en mode onboarding).
 */
import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { SecurityService } from '@services/security/securityService';
import { useSettingsStore } from '@stores/settingsStore';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { t } from '@i18n/index';

export default function PinSetupScreen() {
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const setOnboardingComplete = useSettingsStore((s) => s.setOnboardingComplete);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleSave = async () => {
    if (pin.length < 4) {
      Alert.alert('Erreur', 'PIN doit faire au moins 4 chiffres.');
      return;
    }
    if (pin !== confirm) {
      Alert.alert('Erreur', 'Les PIN ne correspondent pas.');
      return;
    }
    try {
      await SecurityService.enablePin(pin);
      setOnboardingComplete(true);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    }
  };

  const handleSkip = () => {
    setOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.background, padding: spacing[6] }]}>
      <View style={{ flex: 1 }}>
        <Text variant="h2" style={{ marginBottom: spacing[4] }}>
          🔐 Configurer un PIN
        </Text>
        <Text variant="body" color="textSecondary" style={{ marginBottom: spacing[4] }}>
          Choisissez un code à 4 chiffres minimum. Il vous sera demandé à chaque lancement de l'app.
        </Text>
        <Input
          label="PIN"
          value={pin}
          onChangeText={setPin}
          placeholder="••••"
          keyboardType="number-pad"
          secureTextEntry
        />
        <Input
          label="Confirmer le PIN"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="••••"
          keyboardType="number-pad"
          secureTextEntry
        />
      </View>
      <View style={{ gap: spacing[3] }}>
        <Button variant="primary" size="lg" fullWidth onPress={handleSave}>
          {t('common.save')}
        </Button>
        <Button variant="ghost" size="lg" fullWidth onPress={handleSkip}>
          {t('onboarding.security.skip')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
