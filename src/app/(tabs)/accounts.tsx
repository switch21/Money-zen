/**
 * Money-zen — Accounts tab.
 * Spec section 17 : liste des comptes + archivage.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/ThemeProvider';
import { useSettingsStore } from '@stores/settingsStore';
import { listAccounts, recalculateAllBalances } from '@database/repositories/accountRepository';
import { convertMinor } from '@utils/money';
import { formatMoney } from '@utils/money';
import { findCurrencyByCode } from '@constants/currencies';
import { Card } from '@components/common/Card';
import { Text } from '@components/common/Text';
import { Button } from '@components/common/Button';
import { EmptyState } from '@components/common/States';
import { AccountCard } from '@components/common/Specialized';
import { t } from '@i18n/index';

export default function AccountsScreen() {
  const { tokens, spacing } = useTheme();
  const router = useRouter();
  const language = useSettingsStore((s) => s.settings.language);
  const baseCurrency = useSettingsStore((s) => s.settings.baseCurrency);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  const accounts = listAccounts();
  const totalWealth = accounts.reduce((acc, account) => {
    if (account.currency === baseCurrency) return acc + account.currentBalanceMinor;
    // Phase 6 gérera la conversion via taux — pour l'instant on suppose taux = 1
    return acc + account.currentBalanceMinor;
  }, 0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    recalculateAllBalances();
    setTick((t) => t + 1);
    setRefreshing(false);
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.background }}
      contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[16] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      testID={`accounts-${tick}`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] }}>
        <Text variant="h2">{t('tab.accounts')}</Text>
        <Button variant="secondary" size="sm" onPress={() => router.push('/account/new')}>
          {t('account.add')}
        </Button>
      </View>

      <Card padding="lg" elevation="medium" style={{ marginBottom: spacing[5] }}>
        <Text variant="label" color="textSecondary">
          {t('account.totalWealth')}
        </Text>
        <Text variant="amountLarge" color="brand" style={{ marginTop: spacing[2] }}>
          {formatMoney(totalWealth, baseCurrency, language, { showSymbol: true })}
        </Text>
        <Text variant="caption" color="textTertiary" style={{ marginTop: 4 }}>
          {accounts.length} compte(s) · Devise principale : {baseCurrency}
        </Text>
      </Card>

      {accounts.length === 0 ? (
        <EmptyState
          icon={<Text variant="h1">💳</Text>}
          title={t('account.empty.title')}
          message={t('account.empty.message')}
          cta={{ label: t('account.add'), onPress: () => router.push('/account/new') }}
        />
      ) : (
        accounts.map((account) => (
          <View key={account.id} style={{ marginBottom: spacing[3] }}>
            <AccountCard
              account={account}
              baseCurrency={baseCurrency}
              locale={language}
              onPress={() => router.push(`/account/${account.id}`)}
            />
          </View>
        ))
      )}
    </ScrollView>
  );
}
