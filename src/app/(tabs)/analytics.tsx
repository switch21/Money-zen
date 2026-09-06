/**
 * Money-zen — Analytics tab.
 * Spec section 26 + 27 : dépenses par catégorie, évolution, revenus vs dépenses,
 * analyse des comptes, analyse des devises.
 */
import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/settingsStore';
import { periodToRange } from '@utils/date';
import { formatMoney, formatPercent } from '@utils/money';
import { aggregateTransactionsForPeriod, expensesByCategory, listTransactions } from '@database/repositories/transactionRepository';
import { listAccounts } from '@database/repositories/accountRepository';
import { Card, Section } from '@components/common/Card';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { ProgressBar } from '@components/common/Badge';
import { EmptyState } from '@components/common/States';
import { t } from '@i18n/index';
import type { AnalysisPeriod } from '@types/index';

const PERIODS: Array<{ key: AnalysisPeriod; labelKey: string }> = [
  { key: 'this_month', labelKey: 'analytics.period.thisMonth' },
  { key: 'last_month', labelKey: 'analytics.period.lastMonth' },
  { key: 'this_year', labelKey: 'analytics.period.thisYear' },
  { key: 'this_week', labelKey: 'analytics.period.thisWeek' },
];

export default function AnalyticsScreen() {
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const language = useSettingsStore((s) => s.settings.language);
  const baseCurrency = useSettingsStore((s) => s.settings.baseCurrency);
  const [period, setPeriod] = useState<AnalysisPeriod>('this_month');

  const range = periodToRange(period);
  const agg = aggregateTransactionsForPeriod(null, range.start, range.end);
  const byCat = expensesByCategory(range.start, range.end);
  const accounts = listAccounts();
  const recentTx = listTransactions({ limit: 100, dateFrom: range.start, dateTo: range.end });
  const byCurrency = accounts.reduce<Record<string, number>>((acc, a) => {
    acc[a.currency] = (acc[a.currency] ?? 0) + a.currentBalanceMinor;
    return acc;
  }, {});
  const totalWealth = accounts.reduce((acc, a) => acc + a.currentBalanceMinor, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.background }}
      contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[16] }}
    >
      <Text variant="h2" style={{ marginBottom: spacing[4] }}>
        {t('analytics.title')}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2], marginBottom: spacing[4] }}>
        {PERIODS.map((p) => (
          <Button
            key={p.key}
            variant={period === p.key ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => setPeriod(p.key)}
          >
            {t(p.labelKey as never)}
          </Button>
        ))}
      </ScrollView>

      {/* Revenus vs Dépenses */}
      <Section title={<Text variant="title">{t('analytics.incomeVsExpenses')}</Text>}>
        <Card padding="md">
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View>
              <Text variant="label" color="textSecondary">
                {t('dashboard.income')}
              </Text>
              <Text variant="amount" color="positive" style={{ marginTop: 4 }}>
                + {formatMoney(agg.totalIncomeMinor, baseCurrency, language)}
              </Text>
            </View>
            <View>
              <Text variant="label" color="textSecondary">
                {t('dashboard.expenses')}
              </Text>
              <Text variant="amount" color="negative" style={{ marginTop: 4 }}>
                − {formatMoney(agg.totalExpenseMinor, baseCurrency, language)}
              </Text>
            </View>
            <View>
              <Text variant="label" color="textSecondary">
                {t('dashboard.netBalance')}
              </Text>
              <Text variant="amount" color={agg.netMinor >= 0 ? 'positive' : 'negative'} style={{ marginTop: 4 }}>
                {agg.netMinor >= 0 ? '+' : '−'}
                {formatMoney(Math.abs(agg.netMinor), baseCurrency, language)}
              </Text>
            </View>
          </View>
        </Card>
      </Section>

      {/* Dépenses par catégorie */}
      <Section title={<Text variant="title">{t('analytics.byCategory')}</Text>}>
        {byCat.length === 0 ? (
          <EmptyState title="Aucune dépense" message="Pas de dépense sur cette période." />
        ) : (
          <Card padding="md">
            {byCat.map((c) => (
              <View key={c.categoryId} style={{ paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text variant="title">{c.categoryIcon}</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{c.categoryName}</Text>
                  <View style={{ marginTop: 4 }}>
                    <ProgressBar percent={c.percent} variant="brand" />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', width: 100 }}>
                  <Text variant="caption" color="textSecondary">
                    {formatMoney(c.totalMinor, baseCurrency, language)}
                  </Text>
                  <Text variant="caption" color="textTertiary">
                    {formatPercent(c.percent, language)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </Section>

      {/* Répartition par devise */}
      <Section title={<Text variant="title">{t('analytics.byCurrency')}</Text>}>
        <Card padding="md">
          {Object.entries(byCurrency).map(([code, total]) => (
            <View key={code} style={{ paddingVertical: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="bodyStrong">{code}</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Text variant="caption" color="textTertiary">
                  {totalWealth > 0 ? formatPercent((total / totalWealth) * 100, language) : ''}
                </Text>
                <Text variant="body">{formatMoney(total, code, language)}</Text>
              </View>
            </View>
          ))}
        </Card>
      </Section>

      {/* Répartition par compte */}
      <Section title={<Text variant="title">{t('analytics.byAccount')}</Text>}>
        {accounts.length === 0 ? (
          <EmptyState title={t('account.empty.title')} message={t('account.empty.message')} />
        ) : (
          <Card padding="md">
            {accounts.map((a) => (
              <View key={a.id} style={{ paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text variant="title">{a.icon}</Text>
                <Text variant="body" style={{ flex: 1 }}>
                  {a.name}
                </Text>
                <Text variant="bodyStrong" color="brand">
                  {formatMoney(a.currentBalanceMinor, a.currency, language)}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </Section>
    </ScrollView>
  );
}
