/**
 * Money-zen — Onboarding First Account (création du premier compte).
 * Spec section 9 étape 3.
 */
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/settingsStore';
import { createAccount } from '@database/repositories/accountRepository';
import { toMinor } from '@utils/money';
import type { AccountType } from '@types/index';
import { MoneyZenError } from '@types/index';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';

const ACCOUNT_TYPES: Array<{ type: AccountType; label: string; icon: string }> = [
  { type: 'cash', label: 'Espèces', icon: '💵' },
  { type: 'bank', label: 'Compte bancaire', icon: '🏦' },
  { type: 'mobile_money', label: 'Mobile Money', icon: '📱' },
  { type: 'savings', label: 'Épargne', icon: '🐷' },
  { type: 'card', label: 'Carte bancaire', icon: '💳' },
];

export default function OnboardingFirstAccount() {
  const { tokens, spacing, radius } = useTheme();
  const router = useRouter();
  const baseCurrency = useSettingsStore((s) => s.settings.baseCurrency);

  const [name, setName] = useState('Espèces');
  const [type, setType] = useState<AccountType>('cash');
  const [balanceText, setBalanceText] = useState('100000');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    try {
      const balance = balanceText && balanceText.length > 0 ? toMinor(parseFloat(balanceText.replace(',', '.')), baseCurrency) : 0;
      createAccount({
        name,
        type,
        currency: baseCurrency,
        initialBalanceMinor: balance,
        icon: ACCOUNT_TYPES.find((t) => t.type === type)?.icon ?? '💵',
        color: '#C97048',
      });
      router.push('/onboarding/security');
    } catch (e) {
      const msg = e instanceof MoneyZenError ? e.message : 'Erreur lors de la création du compte.';
      setError(msg);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.background, padding: spacing[6] }]}>
      <View style={{ flex: 1 }}>
        <Text variant="h2" style={{ marginBottom: spacing[2] }}>
          Créons votre premier compte
        </Text>
        <Text variant="body" color="textSecondary" style={{ marginBottom: spacing[6] }}>
          Un compte représente où se trouve votre argent (espèces, banque, etc.).
        </Text>
        <ScrollView>
          <Input label="Nom du compte" value={name} onChangeText={setName} placeholder="ex. Espèces" />
          <Text variant="label" style={{ marginBottom: spacing[2] }}>
            Type de compte
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4] }}>
            {ACCOUNT_TYPES.map((t) => {
              const sel = t.type === type;
              return (
                <Button key={t.type} variant={sel ? 'primary' : 'secondary'} size="sm" onPress={() => setType(t.type)}>
                  {t.icon} {t.label}
                </Button>
              );
            })}
          </View>
          <Input
            label="Solde initial"
            value={balanceText}
            onChangeText={setBalanceText}
            placeholder="0"
            keyboardType="decimal-pad"
            helper={`Devise : ${baseCurrency}`}
          />
          {error ? (
            <View style={{ marginTop: spacing[2] }}>
              <Text variant="body" color="error">
                {error}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
      <Button variant="primary" size="lg" fullWidth onPress={handleSubmit}>
        Valider
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
