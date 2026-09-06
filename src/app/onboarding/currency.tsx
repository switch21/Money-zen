/**
 * Money-zen — Onboarding Currency (choix devise principale).
 * Spec section 9 étape 2.
 */
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/settingsStore';
import { listEnabledCurrencies, enableCurrency } from '@database/repositories/currencyRepository';
import { setAppLanguage } from '@i18n/index';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';

export default function OnboardingCurrency() {
  const { tokens, spacing, radius } = useTheme();
  const router = useRouter();
  const setBaseCurrency = useSettingsStore((s) => s.setBaseCurrency);
  const [selected, setSelected] = useState('XAF');

  const currencies = listEnabledCurrencies();

  const handleContinue = () => {
    setBaseCurrency(selected);
    setAppLanguage(useSettingsStore.getState().settings.language);
    router.push('/onboarding/account');
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.background, padding: spacing[6] }]}>
      <View style={{ flex: 1 }}>
        <Text variant="h2" style={{ marginBottom: spacing[2] }}>
          Choisissez votre devise principale
        </Text>
        <Text variant="body" color="textSecondary" style={{ marginBottom: spacing[6] }}>
          Toutes vos agrégations seront affichées dans cette devise. Vous pourrez la changer plus tard.
        </Text>
        <ScrollView>
          <View style={{ gap: spacing[2] }}>
            {currencies.map((c) => {
              const isSel = c.code === selected;
              return (
                <TouchableOpacity
                  key={c.code}
                  onPress={() => setSelected(c.code)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: spacing[3],
                    paddingHorizontal: spacing[4],
                    borderRadius: radius.lg,
                    borderWidth: 1.5,
                    borderColor: isSel ? tokens.brand : tokens.border,
                    backgroundColor: isSel ? tokens.brandSoft : tokens.surface,
                  }}
                >
                  <Text variant="title" style={{ marginRight: 12 }}>
                    {c.flag}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{c.name}</Text>
                    <Text variant="caption" color="textTertiary">
                      {c.code} · {c.symbol}
                    </Text>
                  </View>
                  {isSel ? (
                    <Text variant="title" color="brand">
                      ✓
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
      <Button variant="primary" size="lg" fullWidth onPress={handleContinue}>
        Continuer
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
