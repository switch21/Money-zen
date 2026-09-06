/**
 * Money-zen — Components spécialisés (TransactionItem, AccountCard, BudgetProgress, GoalProgress).
 */
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@theme/ThemeProvider';
import { formatMoney, formatPercent } from '@utils/money';
import { formatShortDate } from '@utils/date';
import type {
  Account,
  BudgetPeriodStatus,
  CurrencyCode,
  GoalStatus,
  MoneyMinor,
  Transaction,
} from '@types/index';
import { Badge, ProgressBar } from './Badge';
import { Card } from './Card';
import { Text } from './Text';

// ─── TransactionItem ─────────────────────────────────────────────────────────
interface TransactionItemProps {
  transaction: Transaction;
  account?: Pick<Account, 'name' | 'currency'> | null;
  category?: { name: string; icon: string; color: string } | null;
  baseCurrency: CurrencyCode;
  locale: 'fr' | 'en';
  onPress?: () => void;
  testID?: string;
}

export function TransactionItem({
  transaction,
  account,
  category,
  baseCurrency,
  locale,
  onPress,
  testID,
}: TransactionItemProps) {
  const { tokens, spacing, radius } = useTheme();
  const isIncoming = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const sign = isIncoming ? '+' : isTransfer ? '⇄' : '−';
  const color = isIncoming ? tokens.positive : isTransfer ? tokens.info : tokens.negative;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], paddingHorizontal: spacing[4] }}
      testID={testID}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.md,
          backgroundColor: category?.color ?? tokens.neutral,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: spacing[3],
        }}
      >
        <Text variant="title" color="textOnAccent">
          {category?.icon ?? '📦'}
        </Text>
      </View>
      <View style={{ flex: 1, marginRight: spacing[2] }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {transaction.description || category?.name || transaction.type}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Text variant="caption" color="textTertiary">
            {formatShortDate(transaction.date)}
          </Text>
          {account ? (
            <Text variant="caption" color="textTertiary">
              {' · '}
              {account.name}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="amount" color={isIncoming ? 'positive' : isTransfer ? 'info' : 'negative'} style={{ fontVariant: ['tabular-nums'] }}>
          {sign} {formatMoney(transaction.amountMinor, transaction.currencyCode, locale, { showSymbol: true })}
        </Text>
        {transaction.currencyCode !== baseCurrency ? (
          <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
            ≈ {formatMoney(transaction.convertedAmountMinor, baseCurrency, locale, { showSymbol: true })}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── AccountCard ─────────────────────────────────────────────────────────────
interface AccountCardProps {
  account: Account;
  baseCurrency: CurrencyCode;
  locale: 'fr' | 'en';
  onPress?: () => void;
  testID?: string;
}

export function AccountCard({ account, baseCurrency, locale, onPress, testID }: AccountCardProps) {
  const { tokens, spacing } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} testID={testID}>
      <Card padding="md" elevation="low">
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: account.color,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: spacing[3],
            }}
          >
            <Text variant="title" color="textOnAccent">
              {account.icon}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {account.name}
            </Text>
            <Text variant="caption" color="textTertiary">
              {account.currency}
            </Text>
          </View>
        </View>
        <View style={{ marginTop: spacing[4] }}>
          <Text variant="amountLarge" align="right" style={{ fontVariant: ['tabular-nums'] }}>
            {formatMoney(account.currentBalanceMinor, account.currency, locale, { showSymbol: true })}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ─── BudgetProgress ──────────────────────────────────────────────────────────
interface BudgetProgressProps {
  status: BudgetPeriodStatus;
  baseCurrency: CurrencyCode;
  locale: 'fr' | 'en';
  onPress?: () => void;
  testID?: string;
}

export function BudgetProgress({ status, baseCurrency, locale, onPress, testID }: BudgetProgressProps) {
  const { tokens, spacing } = useTheme();
  const variant =
    status.status === 'over'
      ? 'error'
      : status.status === 'alert'
        ? 'error'
        : status.status === 'warning'
          ? 'warning'
          : 'success';
  const badgeVariant =
    status.status === 'over' ? 'error' : status.status === 'alert' ? 'error' : status.status === 'warning' ? 'warning' : 'success';
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} testID={testID}>
      <Card padding="md">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="bodyStrong">{status.budget.name}</Text>
          <Badge label={`${status.progressPercent.toFixed(0)} %`} variant={badgeVariant} />
        </View>
        <View style={{ marginTop: spacing[3] }}>
          <ProgressBar percent={status.progressPercent} variant={variant} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[2] }}>
          <Text variant="caption" color="textSecondary">
            {formatMoney(status.spentMinor, baseCurrency, locale)} / {formatMoney(status.budget.amountMinor, baseCurrency, locale)}
          </Text>
          <Text variant="caption" color={status.remainingMinor < 0 ? 'error' : 'positive'}>
            {status.remainingMinor >= 0
              ? `${formatMoney(status.remainingMinor, baseCurrency, locale)} restants`
              : `${formatMoney(-status.remainingMinor, baseCurrency, locale)} dépassés`}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ─── GoalProgress ───────────────────────────────────────────────────────────
interface GoalProgressProps {
  status: GoalStatus;
  baseCurrency: CurrencyCode;
  locale: 'fr' | 'en';
  onPress?: () => void;
  testID?: string;
}

export function GoalProgress({ status, baseCurrency, locale, onPress, testID }: GoalProgressProps) {
  const { spacing } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} testID={testID}>
      <Card padding="md">
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="title" style={{ marginRight: 8 }}>
            {status.goal.icon}
          </Text>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{status.goal.name}</Text>
            <Text variant="caption" color="textTertiary">
              {status.goal.targetDate}
            </Text>
          </View>
          <Text variant="amount" color="brand">
            {formatPercent(status.progressPercent, locale)}
          </Text>
        </View>
        <View style={{ marginTop: spacing[3] }}>
          <ProgressBar percent={status.progressPercent} variant="brand" />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[2] }}>
          <Text variant="caption" color="textSecondary">
            {formatMoney(status.goal.currentAmountMinor, baseCurrency, locale)} / {formatMoney(status.goal.targetAmountMinor, baseCurrency, locale)}
          </Text>
          <Text variant="caption" color="positive">
            Épargne : {formatMoney(status.monthlySavingsNeeded as MoneyMinor, baseCurrency, locale)} / mois
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}
