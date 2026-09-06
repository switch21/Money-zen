/**
 * Money-zen — Transfert entre comptes (Phase 5).
 * Spec section 19 : source, destination, montant, taux, frais.
 */
import { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/settingsStore';
import { listAccounts } from '@database/repositories/accountRepository';
import { createTransfer } from '@database/repositories/transferRepository';
import { getLatestRate } from '@database/repositories/exchangeRateRepository';
import { formatMoney, toMinor, convertMinor } from '@utils/money';
import { AmountInput } from '@components/common/AmountInput';
import { Card } from '@components/common/Card';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { MoneyZenError } from '@types/index';
import { t } from '@i18n/index';
import { format } from 'date-fns';

export default function CreateTransferScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const baseCurrency = useSettingsStore((s) => s.settings.baseCurrency);

  const accounts = listAccounts();
  const [sourceId, setSourceId] = useState<string>(from ?? accounts[0]?.id ?? '');
  const [destId, setDestId] = useState<string>(accounts[1]?.id ?? accounts[0]?.id ?? '');
  const [amountMinor, setAmountMinor] = useState(0);
  const [description, setDescription] = useState('');
  const [feeText, setFeeText] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const sourceAccount = accounts.find((a) => a.id === sourceId);
  const destAccount = accounts.find((a) => a.id === destId);
  const sameCurrency = sourceAccount?.currency === destAccount?.currency;
  const rateRow = sameCurrency ? null : getLatestRate(sourceAccount?.currency ?? baseCurrency, destAccount?.currency ?? baseCurrency);
  const rate = rateRow?.rate ?? 1.0;

  const previewDestMinor = sameCurrency
    ? amountMinor
    : convertMinor(amountMinor, sourceAccount?.currency ?? baseCurrency, destAccount?.currency ?? baseCurrency, rate);

  const handleSave = () => {
    try {
      if (amountMinor <= 0) {
        Alert.alert('Erreur', 'Le montant doit être > 0.');
        return;
      }
      if (sourceId === destId) {
        Alert.alert('Erreur', t('transfer.error.sameAccount'));
        return;
      }
      const fee = feeText ? toMinor(parseFloat(feeText.replace(',', '.')), sourceAccount!.currency) : null;
      createTransfer({
        sourceAccountId: sourceId,
        destinationAccountId: destId,
        sourceAmountMinor: amountMinor,
        sourceCurrency: sourceAccount!.currency,
        destinationCurrency: destAccount!.currency,
        exchangeRate: sameCurrency ? 1.0 : rate,
        date,
        baseCurrencyCode: baseCurrency,
        description,
        feeAmountMinor: fee,
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
        {t('transaction.transfer')}
      </Text>

      {/* Compte source */}
      <Text variant="label" style={{ marginBottom: spacing[2] }}>
        {t('transfer.source')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3] }}>
        {accounts.map((a) => (
          <Button key={a.id} variant={sourceId === a.id ? 'primary' : 'secondary'} size="sm" onPress={() => setSourceId(a.id)}>
            {a.icon} {a.name}
          </Button>
        ))}
      </View>

      {/* Compte destination */}
      <Text variant="label" style={{ marginBottom: spacing[2] }}>
        {t('transfer.destination')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3] }}>
        {accounts.map((a) => (
          <Button key={a.id} variant={destId === a.id ? 'primary' : 'secondary'} size="sm" onPress={() => setDestId(a.id)}>
            {a.icon} {a.name}
          </Button>
        ))}
      </View>

      {/* Montant */}
      <Text variant="label" style={{ marginTop: spacing[3], marginBottom: spacing[2] }}>
        {t('transfer.amount')}
      </Text>
      <AmountInput value={amountMinor} currencyCode={sourceAccount?.currency ?? baseCurrency} onChange={setAmountMinor} />

      {/* Aperçu destination */}
      {!sameCurrency && amountMinor > 0 ? (
        <Card padding="md" style={{ marginTop: spacing[3] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="body" color="textSecondary">
              {t('transfer.exchangeRate')}
            </Text>
            <Text variant="bodyStrong">
              1 {sourceAccount?.currency} = {rate.toFixed(4)} {destAccount?.currency}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text variant="body" color="textSecondary">
              {t('transfer.received')}
            </Text>
            <Text variant="bodyStrong" color="positive">
              ≈ {formatMoney(previewDestMinor, destAccount?.currency ?? baseCurrency, 'fr', { showSymbol: true })}
            </Text>
          </View>
        </Card>
      ) : null}

      <View style={{ marginTop: spacing[4] }}>
        <Input label={t('transaction.description')} value={description} onChangeText={setDescription} placeholder="ex. Remboursement Orange Money" />
      </View>
      <Input label={t('transfer.fee')} value={feeText} onChangeText={setFeeText} placeholder="0" keyboardType="decimal-pad" />
      <Input label={t('transaction.date')} value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />

      <View style={{ marginTop: spacing[6] }}>
        <Button variant="primary" size="lg" fullWidth onPress={handleSave}>
          {t('common.save')}
        </Button>
      </View>
    </ScrollView>
  );
}
