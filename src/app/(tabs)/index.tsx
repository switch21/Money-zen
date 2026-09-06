/**
 * Money-zen — Dashboard (écran principal).
 * Spec section 20 + 56 : patrimoine, revenus, dépenses, solde net, budgets, objectif, dernières opérations.
 */
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { useDashboard } from '@hooks/useDashboard';
import { useSettingsStore } from '@stores/settingsStore';
import { useAppStore } from '@stores/appStore';
import { formatMoney, formatPercent } from '@utils/money';
import { findCurrencyByCode } from '@constants/currencies';
import { Card, Section } from '@components/common/Card';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { ProgressBar, Badge } from '@components/common/Badge';
import { LoadingState, EmptyState } from '@components/common/States';
import { TransactionItem } from '@components/common/Specialized';
import { t } from '@i18n/index';
import { listAccounts } from '@database/repositories/accountRepository';
import { listCategoriesByType } from '@database/repositories/categoryRepository';

export default function DashboardScreen() {
  const { tokens, spacing, radius } = useTheme();
  const router = useRouter();
  const language = useSettingsStore((s) => s.settings.language);
  const baseCurrency = useSettingsStore((s) => s.settings.baseCurrency);
  const isOnline = useAppStore((s) => s.isOnline);
  const lastSyncedAt = useAppStore((s) => s.lastSyncedAt);
  const [refreshing, setRefreshing] = useState(false);
  // Re-render on refresh
  const [tick, setTick] = useState(0);
  const data = useDashboard('this_month');

  const accounts = listAccounts();
  const allCategories = [...listCategoriesByType('expense'), ...listCategoriesByType('income')];
  const catMap = new Map(allCategories.map((c) => [c.id, c]));
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTick((t) => t + 1);
    setRefreshing(false);
  }, []);

  const locale = language;
  const baseCurrencyMeta = findCurrencyByCode(baseCurrency);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.background }}
      contentContainerStyle={{ padding: spacing[5], gap: spacing[4], paddingBottom: spacing[16] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      testID={`dashboard-${tick}`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Text variant="h3">Bonjour 👋</Text>
        {!isOnline ? <Badge label="Hors ligne" variant="warning" /> : null}
      </View>

      {/* Patrimoine */}
      <Card padding="lg" elevation="medium">
        <Text variant="label" color="textSecondary">
          {t('dashboard.totalWealth')}
        </Text>
        <Text variant="amountLarge" style={{ marginTop: spacing[2] }} color="brand">
          {formatMoney(data.totalWealthMinor, baseCurrency, locale, { showSymbol: true })}
        </Text>
        {data.monthProgressPercent !== null ? (
          <View style={{ marginTop: spacing[2], flexDirection: 'row', alignItems: 'center' }}>
            <Text variant="caption" color={data.monthProgressPercent >= 0 ? 'positive' : 'negative'}>
              {data.monthProgressPercent >= 0 ? '↑' : '↓'} {formatPercent(Math.abs(data.monthProgressPercent), locale)} ce mois
            </Text>
          </View>
        ) : null}
      </Card>

      {/* Revenus / Dépenses / Solde net */}
      <View style={{ flexDirection: 'row', gap: spacing[3] }}>
        <Card padding="md" style={{ flex: 1 }}>
          <Text variant="label" color="textSecondary">
            {t('dashboard.income')}
          </Text>
          <Text variant="amount" color="positive" style={{ marginTop: 4 }}>
            + {formatMoney(data.monthIncomeMinor, baseCurrency, locale, { showSymbol: true })}
          </Text>
        </Card>
        <Card padding="md" style={{ flex: 1 }}>
          <Text variant="label" color="textSecondary">
            {t('dashboard.expenses')}
          </Text>
          <Text variant="amount" color="negative" style={{ marginTop: 4 }}>
            − {formatMoney(data.monthExpenseMinor, baseCurrency, locale, { showSymbol: true })}
          </Text>
        </Card>
      </View>
      <Card padding="md" elevation="low">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="bodyStrong">{t('dashboard.netBalance')}</Text>
          <Text variant="amount" color={data.netMinor >= 0 ? 'positive' : 'negative'}>
            {data.netMinor >= 0 ? '+ ' : '− '}
            {formatMoney(Math.abs(data.netMinor), baseCurrency, locale, { showSymbol: true })}
          </Text>
        </View>
      </Card>

      {/* Dépenses par catégorie */}
      <Section title={<Text variant="title">{t('dashboard.expensesByCategory')}</Text>}>
        <Card padding="md">
          {data.expensesByCategory.length === 0 ? (
            <Text variant="body" color="textTertiary" align="center">
              Aucune dépense ce mois.
            </Text>
          ) : (
            data.expensesByCategory.slice(0, 5).map((cat) => (
              <View key={cat.categoryId} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                <Text variant="title" style={{ marginRight: 8 }}>
                  {cat.categoryIcon}
                </Text>
                <Text variant="body" style={{ flex: 1 }}>
                  {cat.categoryName}
                </Text>
                <View style={{ flex: 1.5, marginRight: 8 }}>
                  <ProgressBar percent={cat.percent} variant="brand" />
                </View>
                <Text variant="caption" color="textSecondary" style={{ width: 80, textAlign: 'right' }}>
                  {formatMoney(cat.totalMinor, baseCurrency, locale, { showSymbol: false })}
                </Text>
              </View>
            ))
          )}
        </Card>
      </Section>

      {/* Budgets */}
      <Section title={<Text variant="title">{t('dashboard.budgets')}</Text>}>
        {data.budgets.length === 0 ? (
          <EmptyState
            title={t('budget.empty.title')}
            message={t('budget.empty.message')}
            cta={{ label: t('budget.add'), onPress: () => router.push('/budget/new') }}
          />
        ) : (
          data.budgets.slice(0, 3).map((b) => (
            <Card key={b.budgetId} padding="md" style={{ marginBottom: spacing[2] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="bodyStrong">{b.name}</Text>
                <Badge
                  label={`${b.progressPercent.toFixed(0)} %`}
                  variant={b.status === 'over' ? 'error' : b.status === 'warning' || b.status === 'alert' ? 'warning' : 'success'}
                />
              </View>
              <View style={{ marginTop: 8 }}>
                <ProgressBar percent={b.progressPercent} variant={b.status === 'over' ? 'error' : b.status === 'normal' ? 'success' : 'warning'} />
              </View>
            </Card>
          ))
        )}
      </Section>

      {/* Objectif */}
      {data.goal ? (
        <Section title={<Text variant="title">{t('dashboard.goals')}</Text>}>
          <Card padding="md">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="title" style={{ marginRight: 12 }}>
                🚗
              </Text>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{data.goal.name}</Text>
                <Text variant="caption" color="textTertiary">
                  {formatPercent(data.goal.progressPercent, locale)}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 8 }}>
              <ProgressBar percent={data.goal.progressPercent} variant="brand" />
            </View>
          </Card>
        </Section>
      ) : null}

      {/* Dernières opérations */}
      <Section
        title={
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="title">{t('dashboard.recentTransactions')}</Text>
            <Button variant="ghost" size="sm" onPress={() => router.push('/(tabs)/transactions')}>
              {t('dashboard.viewAll')}
            </Button>
          </View>
        }
      >
        <Card padding="md">
          {data.recentTransactions.length === 0 ? (
            <EmptyState
              title={t('transaction.empty.title')}
              message={t('transaction.empty.message')}
              cta={{ label: t('transaction.add'), onPress: () => router.push('/transaction/new') }}
            />
          ) : (
            data.recentTransactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                account={tx.accountId ? accountMap.get(tx.accountId) ?? null : null}
                category={tx.categoryId ? catMap.get(tx.categoryId) ?? null : null}
                baseCurrency={baseCurrency}
                locale={locale}
                onPress={() => router.push(`/transaction/${tx.id}`)}
              />
            ))
          )}
        </Card>
      </Section>

      <Button variant="primary" size="lg" fullWidth onPress={() => router.push('/transaction/new')}>
        {t('transaction.add')}
      </Button>
    </ScrollView>
  );
}
