/**
 * Money-zen — Hook : Dashboard.
 * Aggrège toutes les données du dashboard (patrimoine, revenus, dépenses, solde net,
 * budget, objectif, dernières transactions, insight).
 *
 * Pattern : Hook → Repository. Pas de logique métier dans le composant.
 */
import { useMemo } from 'react';

import { listAccounts } from '@database/repositories/accountRepository';
import { aggregateTransactionsForPeriod, expensesByCategory, listTransactions } from '@database/repositories/transactionRepository';
import { listBudgets, getBudgetStatus } from '@database/repositories/budgetRepository';
import { listGoals, getGoalStatus } from '@database/repositories/goalRepository';
import { useSettingsStore } from '@stores/settingsStore';
import { periodToRange } from '@utils/date';
import type { AnalysisPeriod } from '@types/index';
import { convertMinor } from '@utils/money';

export interface DashboardData {
  totalWealthMinor: number;
  baseCurrency: string;
  // Ce mois
  monthIncomeMinor: number;
  monthExpenseMinor: number;
  netMinor: number;
  monthProgressPercent: number | null; // comparaison vs mois précédent
  expensesByCategory: Array<{ categoryId: string; categoryName: string; categoryIcon: string; categoryColor: string; totalMinor: number; percent: number }>;
  budgets: Array<{ budgetId: string; name: string; progressPercent: number; status: string; remainingMinor: number; totalMinor: number }>;
  goal?: { name: string; icon: string; progressPercent: number; remainingMinor: number; monthlySavingsNeeded: number } | null;
  recentTransactions: ReturnType<typeof listTransactions>;
}

export function useDashboard(period: AnalysisPeriod = 'this_month'): DashboardData {
  const baseCurrency = useSettingsStore((s) => s.settings.baseCurrency);
  const language = useSettingsStore((s) => s.settings.language);

  return useMemo(() => {
    const accounts = listAccounts();
    const range = periodToRange(period);
    const prevRange = periodToRange('last_month');

    // Patrimoine = somme des soldes convertis en devise principale
    const totalWealthMinor = accounts.reduce((acc, account) => {
      if (account.currency === baseCurrency) {
        return acc + account.currentBalanceMinor;
      }
      // Convertit en devise principale via taux (pour V1, on suppose taux = 1 si même devise, sinon on prend le solde tel quel)
      // Le vrai taux sera résolu par exchangeRateService (Phase 6).
      return acc + account.currentBalanceMinor;
    }, 0);

    // Agrégats du mois (en devise principale car convertedAmountMinor est déjà converti)
    const monthAgg = aggregateTransactionsForPeriod(null, range.start, range.end);
    const prevAgg = aggregateTransactionsForPeriod(null, prevRange.start, prevRange.end);

    const expensesByCat = expensesByCategory(range.start, range.end);

    const budgets = listBudgets().map((b) => {
      const status = getBudgetStatus(b);
      return {
        budgetId: b.id,
        name: b.name,
        progressPercent: status.progressPercent,
        status: status.status,
        remainingMinor: status.remainingMinor,
        totalMinor: b.amountMinor,
      };
    });

    const goals = listGoals();
    const goal = goals.length > 0 ? (() => {
      const status = getGoalStatus(goals[0]);
      return {
        name: goals[0].name,
        icon: goals[0].icon,
        progressPercent: status.progressPercent,
        remainingMinor: status.remainingMinor,
        monthlySavingsNeeded: status.monthlySavingsNeeded,
      };
    })() : null;

    const recentTransactions = listTransactions({ limit: 5, offset: 0 });

    const prevNet = prevAgg.netMinor;
    const monthProgressPercent = prevNet === 0
      ? null
      : ((monthAgg.netMinor - prevNet) / Math.abs(prevNet)) * 100;

    return {
      totalWealthMinor,
      baseCurrency,
      monthIncomeMinor: monthAgg.totalIncomeMinor,
      monthExpenseMinor: monthAgg.totalExpenseMinor,
      netMinor: monthAgg.netMinor,
      monthProgressPercent,
      expensesByCategory: expensesByCat,
      budgets,
      goal,
      recentTransactions,
    };
  }, [baseCurrency, period, language]);
}
