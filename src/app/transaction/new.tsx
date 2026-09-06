/**
 * Money-zen — Create Transaction screen (Phase 4).
 * Spec section 13 : écran d'ajout extrêmement rapide, clavier numérique, peu de champs obligatoires.
 */
import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/settingsStore';
import { listAccounts } from '@database/repositories/accountRepository';
import { listCategoriesByType } from '@database/repositories/categoryRepository';
import { createTransaction } from '@database/repositories/transactionRepository';
import { getLatestRate } from '@database/repositories/exchangeRateRepository';
import { AmountInput } from '@components/common/AmountInput';
import { CurrencySelector } from '@components/common/CurrencySelector';
import { Card } from '@components/common/Card';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { MoneyZenError } from '@types/index';
import type { TransactionType } from '@types/index';
import { t } from '@i18n/index';
import { format } from 'date-fns';

const TYPES: Array<{ type: TransactionType; label: string; icon: string }> = [
  { type: 'expense', label: 'Dépense', icon: '💸' },
  { type: 'income', label: 'Revenu', icon: '💰' },
];

export default function CreateTransactionScreen() {
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const baseCurrency = useSettingsStore((s) => s.settings.baseCurrency);

  const accounts = listAccounts();
  const [type, setType] = useState<TransactionType>('expense');
  const [amountMinor, setAmountMinor] = useState(0);
  const [currency, setCurrency] = useState(accounts[0]?.currency ?? baseCurrency);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const categories = listCategoriesByType(type === 'expense' ? 'expense' : 'income');

  const handleSave = () => {
    try {
      if (amountMinor <= 0) {
        Alert.alert(t('transaction.error.amount.required'), t('transaction.error.amount.positive'));
        return;
      }
      if (!accountId) {
        Alert.alert('Erreur', t('transaction.error.account.required'));
        return;
      }
      // Taux
      const rateRow = currency !== baseCurrency ? getLatestRate(currency, baseCurrency) : null;
      const rate = rateRow?.rate ?? 1.0;
      const rateDate = rateRow?.rateDate ?? new Date().toISOString();

      const tx = createTransaction({
        type,
        accountId,
        categoryId,
        amountMinor,
        currencyCode: currency,
        date,
        description,
        notes: notes || undefined,
        baseCurrencyCode: baseCurrency,
        exchangeRate: rate,
        exchangeRateDate: rateDate,
      });
      console.info('Transaction créée', tx.id);
      router.back();
    } catch (e) {
      const msg = e instanceof MoneyZenError ? e.message : t('error.save');
      Alert.alert(t('error.save'), msg);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.background }}
      contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[16] }}
    >
      {/* Type toggle */}
      <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] }}>
        {TYPES.map((ty) => (
          <Button key={ty.type} variant={type === ty.type ? 'primary' : 'secondary'} size="lg" fullWidth onPress={() => setType(ty.type)}>
            {ty.icon} {ty.label}
          </Button>
        ))}
      </View>

      {/* Montant */}
      <Text variant="label" style={{ marginBottom: spacing[2] }}>
        {t('transaction.amount')}
      </Text>
      <AmountInput value={amountMinor} currencyCode={currency} onChange={setAmountMinor} testID="amount-input" />

      {/* Devise */}
      <Text variant="label" style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
        {t('transaction.currency')}
      </Text>
      <CurrencySelector value={currency} onSelect={setCurrency} />

      {/* Compte */}
      <Text variant="label" style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
        {t('transaction.account')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {accounts.map((a) => (
          <Button
            key={a.id}
            variant={accountId === a.id ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => {
              setAccountId(a.id);
              setCurrency(a.currency);
            }}
          >
            {a.icon} {a.name}
          </Button>
        ))}
      </View>

      {/* Catégorie */}
      <Text variant="label" style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
        {t('transaction.category')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {categories.map((c) => (
          <Button
            key={c.id}
            variant={categoryId === c.id ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => setCategoryId(c.id)}
          >
            {c.icon} {c.name}
          </Button>
        ))}
      </View>

      {/* Description */}
      <View style={{ marginTop: spacing[4] }}>
        <Input label={t('transaction.description')} value={description} onChangeText={setDescription} placeholder={t('transaction.description.placeholder')} />
      </View>

      {/* Notes (optionnel) */}
      <Input label={t('transaction.notes')} value={notes} onChangeText={setNotes} placeholder={t('transaction.notes.placeholder')} />

      {/* Date */}
      <View style={{ marginTop: spacing[2] }}>
        <Input label={t('transaction.date')} value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
      </View>

      <View style={{ marginTop: spacing[6] }}>
        <Button variant="primary" size="lg" fullWidth onPress={handleSave} testID="save-transaction-btn">
          {t('transaction.save')}
        </Button>
      </View>
    </ScrollView>
  );
}
