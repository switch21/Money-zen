/**
 * Money-zen — Création d'objectif (Phase 10).
 */
import { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/settingsStore';
import { createGoal } from '@database/repositories/goalRepository';
import { listAccounts } from '@database/repositories/accountRepository';
import { AmountInput } from '@components/common/AmountInput';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { MoneyZenError } from '@types/index';
import { t } from '@i18n/index';

const GOAL_ICONS = ['🚗', '✈️', '🏠', '🌳', '🎓', '💻', '🐷', '🎯'];

export default function CreateGoalScreen() {
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const baseCurrency = useSettingsStore((s) => s.settings.baseCurrency);
  const accounts = listAccounts();

  const [name, setName] = useState('');
  const [targetAmountMinor, setTargetAmountMinor] = useState(0);
  const [currentAmountMinor, setCurrentAmountMinor] = useState(0);
  const [icon, setIcon] = useState('🎯');
  const [targetDate, setTargetDate] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState<string | null>(null);

  const handleSave = () => {
    try {
      if (!name.trim()) {
        Alert.alert('Erreur', 'Le nom est requis.');
        return;
      }
      if (targetAmountMinor <= 0) {
        Alert.alert('Erreur', 'Le montant cible doit être > 0.');
        return;
      }
      createGoal({
        name,
        icon,
        targetAmountMinor,
        currentAmountMinor,
        currencyCode: baseCurrency,
        targetDate: targetDate || null,
        linkedAccountId,
      });
      router.back();
    } catch (e) {
      const msg = e instanceof MoneyZenError ? e.message : t('error.save');
      Alert.alert(t('error.save'), msg);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.background }} contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[16] }}>
      <Text variant="h2" style={{ marginBottom: spacing[4] }}>
        {t('goal.add')}
      </Text>

      <Input label={t('goal.name')} value={name} onChangeText={setName} placeholder="ex. Voiture" />

      <Text variant="label" style={{ marginTop: spacing[2], marginBottom: spacing[2] }}>
        {t('goal.targetAmount')}
      </Text>
      <AmountInput value={targetAmountMinor} currencyCode={baseCurrency} onChange={setTargetAmountMinor} />

      <Text variant="label" style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
        {t('goal.currentAmount')}
      </Text>
      <AmountInput value={currentAmountMinor} currencyCode={baseCurrency} onChange={setCurrentAmountMinor} />

      <Text variant="label" style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
        {t('account.icon')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {GOAL_ICONS.map((ic) => (
          <View
            key={ic}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: icon === ic ? tokens.brandSoft : tokens.surface,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: icon === ic ? tokens.brand : 'transparent',
            }}
            onTouchEnd={() => setIcon(ic)}
          >
            <Text variant="title">{ic}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: spacing[4] }}>
        <Input label={t('goal.targetDate')} value={targetDate} onChangeText={setTargetDate} placeholder="AAAA-MM-JJ" />
      </View>

      {accounts.length > 0 ? (
        <>
          <Text variant="label" style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
            {t('goal.linkedAccount')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
            {accounts.map((a) => (
              <Button key={a.id} variant={linkedAccountId === a.id ? 'primary' : 'secondary'} size="sm" onPress={() => setLinkedAccountId(a.id)}>
                {a.icon} {a.name}
              </Button>
            ))}
          </View>
        </>
      ) : null}

      <View style={{ marginTop: spacing[6] }}>
        <Button variant="primary" size="lg" fullWidth onPress={handleSave}>
          {t('common.save')}
        </Button>
      </View>
    </ScrollView>
  );
}
