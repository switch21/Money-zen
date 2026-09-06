/**
 * Money-zen — Création de budget (Phase 8).
 */
import { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/settingsStore';
import { listCategoriesByType } from '@database/repositories/categoryRepository';
import { createBudget } from '@database/repositories/budgetRepository';
import { AmountInput } from '@components/common/AmountInput';
import { Card } from '@components/common/Card';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { MoneyZenError } from '@types/index';
import type { BudgetPeriod } from '@types/index';
import { t } from '@i18n/index';
import { format, lastDayOfMonth } from 'date-fns';

const PERIODS: Array<{ key: BudgetPeriod; labelKey: string }> = [
  { key: 'daily', labelKey: 'budget.period.daily' },
  { key: 'weekly', labelKey: 'budget.period.weekly' },
  { key: 'monthly', labelKey: 'budget.period.monthly' },
  { key: 'quarterly', labelKey: 'budget.period.quarterly' },
  { key: 'yearly', labelKey: 'budget.period.yearly' },
];

export default function CreateBudgetScreen() {
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const baseCurrency = useSettingsStore((s) => s.settings.baseCurrency);
  const categories = listCategoriesByType('expense');

  const [name, setName] = useState('');
  const [amountMinor, setAmountMinor] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');

  const handleSave = () => {
    try {
      if (!name.trim()) {
        Alert.alert('Erreur', 'Le nom du budget est requis.');
        return;
      }
      if (amountMinor <= 0) {
        Alert.alert('Erreur', 'Le montant doit être > 0.');
        return;
      }
      const today = new Date();
      const start = format(today, 'yyyy-MM-dd');
      const end = format(lastDayOfMonth(today), 'yyyy-MM-dd');
      createBudget({
        name,
        categoryId,
        currencyCode: baseCurrency,
        amountMinor,
        period,
        startDate: start,
        endDate: end,
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
        {t('budget.add')}
      </Text>

      <Input label={t('budget.name')} value={name} onChangeText={setName} placeholder="ex. Alimentation" />

      <Text variant="label" style={{ marginTop: spacing[2], marginBottom: spacing[2] }}>
        {t('budget.amount')}
      </Text>
      <AmountInput value={amountMinor} currencyCode={baseCurrency} onChange={setAmountMinor} />

      <Text variant="label" style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
        {t('budget.category')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {categories.map((c) => (
          <Button key={c.id} variant={categoryId === c.id ? 'primary' : 'secondary'} size="sm" onPress={() => setCategoryId(c.id)}>
            {c.icon} {c.name}
          </Button>
        ))}
      </View>

      <Text variant="label" style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
        {t('budget.period')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {PERIODS.map((p) => (
          <Button key={p.key} variant={period === p.key ? 'primary' : 'secondary'} size="sm" onPress={() => setPeriod(p.key)}>
            {t(p.labelKey as never)}
          </Button>
        ))}
      </View>

      <View style={{ marginTop: spacing[6] }}>
        <Button variant="primary" size="lg" fullWidth onPress={handleSave}>
          {t('common.save')}
        </Button>
      </View>
    </ScrollView>
  );
}
