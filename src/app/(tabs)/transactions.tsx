/**
 * Money-zen — Transactions tab (historique + recherche + filtres).
 * Spec section 22.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';

import { useTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/settingsStore';
import { listAccounts } from '@database/repositories/accountRepository';
import { listTransactions, type TransactionFilters } from '@database/repositories/transactionRepository';
import { listCategoriesByType } from '@database/repositories/categoryRepository';
import { Input } from '@components/common/Input';
import { Card } from '@components/common/Card';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { Badge } from '@components/common/Badge';
import { EmptyState, LoadingState } from '@components/common/States';
import { TransactionItem } from '@components/common/Specialized';
import { t } from '@i18n/index';
import type { TransactionType } from '@types/index';

const TYPE_FILTERS: Array<{ key: TransactionType | 'all'; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'expense', label: 'Dépenses' },
  { key: 'income', label: 'Revenus' },
  { key: 'transfer', label: 'Transferts' },
];

export default function TransactionsScreen() {
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const language = useSettingsStore((s) => s.settings.language);
  const baseCurrency = useSettingsStore((s) => s.settings.baseCurrency);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');

  const accounts = listAccounts();
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const allCategories = [...listCategoriesByType('expense'), ...listCategoriesByType('income'), ...listCategoriesByType('transfer')];
  const catMap = new Map(allCategories.map((c) => [c.id, c]));

  const filters: TransactionFilters = {
    type: typeFilter,
    search: search.trim().length >= 2 ? search : null,
    limit: 200,
    offset: 0,
  };
  const transactions = listTransactions(filters);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTick((t) => t + 1);
    setRefreshing(false);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background }} testID={`transactions-${tick}`}>
      <View style={{ padding: spacing[5], gap: spacing[3] }}>
        <Text variant="h2">{t('tab.transactions')}</Text>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder={t('transaction.search.placeholder')}
          leftIcon={<Text>🔍</Text>}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
          {TYPE_FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={typeFilter === f.key ? 'primary' : 'secondary'}
              size="sm"
              onPress={() => setTypeFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </ScrollView>
      </View>

      <View style={{ flex: 1, paddingHorizontal: spacing[5] }}>
        {transactions.length === 0 ? (
          <EmptyState
            icon={<Text variant="h1">📝</Text>}
            title={t('transaction.empty.title')}
            message={t('transaction.empty.message')}
            cta={{ label: t('transaction.add'), onPress: () => router.push('/transaction/new') }}
          />
        ) : (
          <FlashList
            data={transactions}
            keyExtractor={(item) => item.id}
            estimatedItemSize={68}
            contentContainerStyle={{ paddingBottom: spacing[16] }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <TransactionItem
                transaction={item}
                account={item.accountId ? accountMap.get(item.accountId) ?? null : null}
                category={item.categoryId ? catMap.get(item.categoryId) ?? null : null}
                baseCurrency={baseCurrency}
                locale={language}
                onPress={() => router.push(`/transaction/${item.id}`)}
              />
            )}
          />
        )}
      </View>

      <View style={{ position: 'absolute', bottom: 24, right: 24 }}>
        <Button variant="primary" size="lg" onPress={() => router.push('/transaction/new')} testID="add-transaction-btn">
          +
        </Button>
      </View>
    </View>
  );
}
