/**
 * Money-zen — Détail d'un compte (consultation, archivage, transfert).
 */
import { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/settingsStore';
import { getAccountById, archiveAccount, recalculateBalance, updateAccount } from '@database/repositories/accountRepository';
import { listTransactions } from '@database/repositories/transactionRepository';
import { formatMoney } from '@utils/money';
import { Card } from '@components/common/Card';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { ConfirmDialog } from '@components/common/ConfirmDialog';
import { EmptyState } from '@components/common/States';
import { TransactionItem } from '@components/common/Specialized';
import { getCategoryById } from '@database/repositories/categoryRepository';
import { t } from '@i18n/index';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const language = useSettingsStore((s) => s.settings.language);
  const baseCurrency = useSettingsStore((s) => s.settings.baseCurrency);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [tick, setTick] = useState(0);

  const account = id ? getAccountById(id) : null;
  if (!account) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing[5] }}>
        <EmptyState title={t('error.notFound')} cta={{ label: t('common.back'), onPress: () => router.back() }} />
      </View>
    );
  }

  const transactions = listTransactions({ accountId: account.id, limit: 50 });
  const catMap = new Map<string, { name: string; icon: string; color: string }>();
  transactions.forEach((tx) => {
    if (tx.categoryId) {
      const c = getCategoryById(tx.categoryId);
      if (c) catMap.set(c.id, { name: c.name, icon: c.icon, color: c.color });
    }
  });

  const [name, setName] = useState(account.name);
  const [notes, setNotes] = useState(account.notes ?? '');

  const handleSave = () => {
    updateAccount(account.id, { name, notes });
    setTick((t) => t + 1);
  };

  const handleArchive = () => {
    archiveAccount(account.id);
    router.back();
  };

  const handleRecalculate = () => {
    const newBalance = recalculateBalance(account.id);
    Alert.alert('Solde recalculé', formatMoney(newBalance, account.currency, language, { showSymbol: true }));
    setTick((t) => t + 1);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.background }}
      contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[16] }}
      testID={`account-${tick}`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[4] }}>
        <Button variant="ghost" size="sm" onPress={() => router.back()}>
          ← {t('common.back')}
        </Button>
        <Button variant="ghost" size="sm" onPress={() => router.push(`/transfer/new?from=${account.id}`)}>
          ⇄ Transfert
        </Button>
      </View>

      <Card padding="lg" elevation="medium" style={{ marginBottom: spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing[4] }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: account.color, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <Text variant="h2" color="textOnAccent">
              {account.icon}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title">{account.name}</Text>
            <Text variant="caption" color="textTertiary">
              {account.type} · {account.currency}
            </Text>
          </View>
        </View>
        <Text variant="label" color="textSecondary">
          {t('account.currentBalance')}
        </Text>
        <Text variant="amountLarge" color="brand" style={{ marginTop: 4 }}>
          {formatMoney(account.currentBalanceMinor, account.currency, language, { showSymbol: true })}
        </Text>
        <Text variant="caption" color="textTertiary" style={{ marginTop: 4 }}>
          {t('account.initialBalance')}: {formatMoney(account.initialBalanceMinor, account.currency, language)}
        </Text>
      </Card>

      <Input label={t('account.name')} value={name} onChangeText={setName} />
      <Input label={t('transaction.notes')} value={notes} onChangeText={setNotes} placeholder="Notes privées" />

      <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] }}>
        <Button variant="primary" size="md" fullWidth onPress={handleSave}>
          {t('common.save')}
        </Button>
        <Button variant="secondary" size="md" onPress={handleRecalculate}>
          Recalculer solde
        </Button>
      </View>

      <View style={{ marginTop: spacing[6], marginBottom: spacing[3] }}>
        <Text variant="title">Transactions liées ({transactions.length})</Text>
      </View>
      <Card padding="md">
        {transactions.length === 0 ? (
          <Text variant="body" color="textTertiary" align="center">
            Aucune transaction.
          </Text>
        ) : (
          transactions.slice(0, 10).map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              account={{ name: account.name, currency: account.currency }}
              category={tx.categoryId ? catMap.get(tx.categoryId) ?? null : null}
              baseCurrency={baseCurrency}
              locale={language}
              onPress={() => router.push(`/transaction/${tx.id}`)}
            />
          ))
        )}
      </Card>

      <View style={{ marginTop: spacing[6] }}>
        <Button variant="danger" size="md" fullWidth onPress={() => setConfirmArchive(true)}>
          {t('account.archive')}
        </Button>
      </View>

      <ConfirmDialog
        visible={confirmArchive}
        title={t('account.delete.confirm')}
        message={t('account.delete.confirm.message')}
        confirmLabel={t('common.archive')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleArchive}
        onCancel={() => setConfirmArchive(false)}
      />
    </ScrollView>
  );
}
