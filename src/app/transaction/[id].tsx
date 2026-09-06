/**
 * Money-zen — Détail d'une transaction (consultation + modification + suppression).
 */
import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/settingsStore';
import { getTransactionById, softDeleteTransaction, updateTransaction } from '@database/repositories/transactionRepository';
import { getAccountById } from '@database/repositories/accountRepository';
import { getCategoryById } from '@database/repositories/categoryRepository';
import { getTransferByTransactionId } from '@database/repositories/transferRepository';
import { formatMoney } from '@utils/money';
import { format } from 'date-fns';
import { Card } from '@components/common/Card';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { Badge } from '@components/common/Badge';
import { ConfirmDialog } from '@components/common/ConfirmDialog';
import { EmptyState } from '@components/common/States';
import { t } from '@i18n/index';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const language = useSettingsStore((s) => s.settings.language);
  const baseCurrency = useSettingsStore((s) => s.settings.baseCurrency);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tick, setTick] = useState(0);

  const tx = id ? getTransactionById(id) : null;
  if (!tx) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing[5] }}>
        <EmptyState title={t('error.notFound')} cta={{ label: t('common.back'), onPress: () => router.back() }} />
      </View>
    );
  }

  const account = tx.accountId ? getAccountById(tx.accountId) : null;
  const category = tx.categoryId ? getCategoryById(tx.categoryId) : null;
  const transfer = tx.type === 'transfer' ? getTransferByTransactionId(tx.id) : null;

  const [description, setDescription] = useState(tx.description);
  const [notes, setNotes] = useState(tx.notes ?? '');
  const [date, setDate] = useState(tx.date);

  const handleSave = () => {
    updateTransaction(tx.id, { description, notes, date });
    setTick((t) => t + 1);
  };

  const handleDelete = () => {
    softDeleteTransaction(tx.id);
    router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.background }}
      contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[16] }}
      testID={`tx-${tick}`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] }}>
        <Button variant="ghost" size="sm" onPress={() => router.back()}>
          ← {t('common.back')}
        </Button>
        <Badge
          label={t(`transaction.type.${tx.type}` as never)}
          variant={tx.type === 'income' ? 'success' : tx.type === 'expense' ? 'error' : 'info'}
        />
      </View>

      <Card padding="lg" elevation="medium" style={{ marginBottom: spacing[4] }}>
        <Text variant="label" color="textSecondary">
          {t('transaction.amount')}
        </Text>
        <Text variant="amountLarge" color={tx.type === 'income' ? 'positive' : 'negative'} style={{ marginTop: 8 }}>
          {tx.type === 'income' ? '+' : '−'}
          {formatMoney(tx.amountMinor, tx.currencyCode, language, { showSymbol: true })}
        </Text>
        {tx.currencyCode !== baseCurrency ? (
          <Text variant="caption" color="textTertiary" style={{ marginTop: 4 }}>
            ≈ {formatMoney(tx.convertedAmountMinor, baseCurrency, language, { showSymbol: true })}
          </Text>
        ) : null}
      </Card>

      <Card padding="md" style={{ marginBottom: spacing[3] }}>
        <Text variant="label" color="textSecondary">
          {t('transaction.account')}
        </Text>
        <Text variant="bodyStrong" style={{ marginTop: 4 }}>
          {account?.icon} {account?.name ?? '—'}
        </Text>
      </Card>

      <Card padding="md" style={{ marginBottom: spacing[3] }}>
        <Text variant="label" color="textSecondary">
          {t('transaction.category')}
        </Text>
        <Text variant="bodyStrong" style={{ marginTop: 4 }}>
          {category?.icon} {category?.name ?? '—'}
        </Text>
      </Card>

      {transfer ? (
        <Card padding="md" style={{ marginBottom: spacing[3] }}>
          <Text variant="label" color="textSecondary">
            Transfert
          </Text>
          <Text variant="bodyStrong" style={{ marginTop: 4 }}>
            {formatMoney(transfer.sourceAmountMinor, transfer.sourceCurrency, language, { showSymbol: true })}{' '}
            {' → '}{' '}
            {formatMoney(transfer.destinationAmountMinor, transfer.destinationCurrency, language, { showSymbol: true })}
          </Text>
        </Card>
      ) : null}

      <View style={{ marginTop: spacing[2] }}>
        <Input label={t('transaction.description')} value={description} onChangeText={setDescription} />
      </View>
      <Input label={t('transaction.notes')} value={notes} onChangeText={setNotes} placeholder={t('transaction.notes.placeholder')} />
      <Input label={t('transaction.date')} value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />

      <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[4] }}>
        <Button variant="primary" size="lg" fullWidth onPress={handleSave}>
          {t('common.save')}
        </Button>
        <Button variant="danger" size="lg" onPress={() => setConfirmDelete(true)}>
          {t('common.delete')}
        </Button>
      </View>

      <ConfirmDialog
        visible={confirmDelete}
        title={t('transaction.delete.confirm')}
        message={t('transaction.delete.confirm.message')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </ScrollView>
  );
}
