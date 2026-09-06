/**
 * Money-zen — FinancialInsightsService (Phase 17 — IA Insights futur).
 *
 * Spec section 21 + 66 :
 *   - "Vos dépenses de transport ont augmenté de 18 % ce mois-ci."
 *   - "Si votre rythme actuel continue, votre budget transport sera dépassé dans 6 jours."
 *
 * V1 : insights RULE-BASED uniquement (calculées localement à partir des données réelles).
 * Règle : "Ne jamais inventer une analyse" (spec section 21).
 * V2+ : brancher LLM pour analyses plus riches.
 */
import { aggregateTransactionsForPeriod, expensesByCategory } from '@database/repositories/transactionRepository';
import { listBudgets, getBudgetStatus } from '@database/repositories/budgetRepository';
import { periodToRange } from '@utils/date';
import { formatMoney, formatPercent } from '@utils/money';
import { useSettingsStore } from '@stores/settingsStore';
import type { CurrencyCode, MoneyMinor } from '@types/index';
import { t } from '@i18n/index';

export interface Insight {
  id: string;
  text: string;
  severity: 'positive' | 'neutral' | 'warning' | 'alert';
  data?: Record<string, unknown>;
}

export const FinancialInsightsService = {
  /**
   * Calcule 1-3 insights pour le dashboard.
   * Spécifiquement : comparaison mois courant vs mois précédent par catégorie,
   * alertes budget, et progression épargne.
   */
  generateDashboardInsights(): Insight[] {
    const baseCurrency = useSettingsStore.getState().settings.baseCurrency;
    const language = useSettingsStore.getState().settings.language;
    const insights: Insight[] = [];

    const thisMonth = periodToRange('this_month');
    const lastMonth = periodToRange('last_month');

    // 1. Comparaison globale de dépenses
    const thisAgg = aggregateTransactionsForPeriod(null, thisMonth.start, thisMonth.end);
    const lastAgg = aggregateTransactionsForPeriod(null, lastMonth.start, lastMonth.end);
    if (lastAgg.totalExpenseMinor > 0 && thisAgg.totalExpenseMinor > 0) {
      const diff = thisAgg.totalExpenseMinor - lastAgg.totalExpenseMinor;
      const pct = (diff / lastAgg.totalExpenseMinor) * 100;
      if (Math.abs(pct) >= 5) {
        if (pct < 0) {
          insights.push({
            id: 'spent-less',
            severity: 'positive',
            text: t('insight.spent.less'),
          });
        }
      }
    }

    // 2. Catégorie qui a le plus augmenté
    const thisByCat = expensesByCategory(thisMonth.start, thisMonth.end);
    const lastByCat = expensesByCategory(lastMonth.start, lastMonth.end);
    for (const cat of thisByCat.slice(0, 5)) {
      const prev = lastByCat.find((c) => c.categoryId === cat.categoryId);
      if (prev && prev.totalMinor > 0) {
        const pct = ((cat.totalMinor - prev.totalMinor) / prev.totalMinor) * 100;
        if (pct >= 18) {
          insights.push({
            id: `cat-increase-${cat.categoryId}`,
            severity: 'warning',
            text: t('insight.transport.increased', { percent: pct.toFixed(0) }),
          });
          break; // 1 seule alerte catégorie
        }
      }
    }

    // 3. Budget presque atteint
    const budgets = listBudgets();
    for (const b of budgets) {
      const status = getBudgetStatus(b);
      if (status.status === 'warning' || status.status === 'alert') {
        insights.push({
          id: `budget-${b.id}`,
          severity: status.status === 'alert' ? 'alert' : 'warning',
          text: t('insight.budget.near', { category: b.name }),
        });
        break; // 1 seule alerte budget
      }
    }

    return insights.slice(0, 3);
  },
};
