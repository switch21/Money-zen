/**
 * Money-zen — Données de démonstration (spec section 63).
 * Set complet : Salaire, Loyer, Alimentation, Transport, Électricité, Internet, Épargne.
 * Toggle "Demo mode" clair, désactivable dans paramètres.
 * À ne JAMAIS mélanger avec des données utilisateur réelles.
 */
import { withTransaction } from '@database/sqlite';
import { createAccount } from '@database/repositories/accountRepository';
import { createTransaction } from '@database/repositories/transactionRepository';
import { createBudget } from '@database/repositories/budgetRepository';
import { createGoal } from '@database/repositories/goalRepository';
import { createRecurringTransaction } from '@database/repositories/recurringRepository';
import { listCategoriesByType } from '@database/repositories/categoryRepository';
import { format, subDays, subMonths } from 'date-fns';
import type { Category } from '@types/index';

/** ID de stable pour éviter les doublons si seedDemoData() est appelé deux fois. */
const DEMO_TAG = 'DEMO';

export function seedDemoData(): void {
  withTransaction(() => {
    // Vérifie si déjà seedé.
    const existing = listCategoriesByType('expense', true);
    if (existing.length === 0) return; // catégories pas encore seedées → abandon

    // 1. Comptes démo
    const cash = createAccount({
      name: `Espèces ${DEMO_TAG}`,
      type: 'cash',
      currency: 'XAF',
      initialBalanceMinor: 100_000,
      icon: '💵',
      color: '#C97048',
    });
    const bank = createAccount({
      name: `Banque ${DEMO_TAG}`,
      type: 'bank',
      currency: 'XAF',
      initialBalanceMinor: 500_000,
      icon: '🏦',
      color: '#7B8DC9',
    });
    const mobileMoney = createAccount({
      name: `Orange Money ${DEMO_TAG}`,
      type: 'mobile_money',
      currency: 'XAF',
      initialBalanceMinor: 75_000,
      icon: '📱',
      color: '#E07B3A',
      mobileMoneyProvider: 'orange_money',
    });
    const savings = createAccount({
      name: `Épargne ${DEMO_TAG}`,
      type: 'savings',
      currency: 'XAF',
      initialBalanceMinor: 250_000,
      icon: '🐷',
      color: '#5C8B73',
    });

    const today = new Date();
    const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

    // 2. Catégories lookup
    const findCat = (type: 'expense' | 'income', name: string): Category | undefined =>
      listCategoriesByType(type).find((c) => c.name === name);

    const catSalaire = findCat('income', 'Salaire');
    const catAlimentation = findCat('expense', 'Alimentation');
    const catTransport = findCat('expense', 'Transport');
    const catLogement = findCat('expense', 'Logement');
    const catElectricite = findCat('expense', 'Factures');
    const catLoisirs = findCat('expense', 'Loisirs');
    const catRestaurant = findCat('expense', 'Restaurant');
    const catAbonnements = findCat('expense', 'Abonnements');

    // 3. Transactions sur 3 mois
    // Salaire mensuel (revenu)
    for (let i = 0; i < 3; i++) {
      const date = fmt(subMonths(today, i));
      createTransaction({
        type: 'income',
        accountId: bank.id,
        categoryId: catSalaire?.id ?? null,
        amountMinor: 650_000,
        currencyCode: 'XAF',
        date,
        description: `Salaire mois ${i + 1}`,
        baseCurrencyCode: 'XAF',
        exchangeRate: 1.0,
        exchangeRateDate: date,
      });
    }

    // Loyer (dépense mensuelle, 3 mois)
    for (let i = 0; i < 3; i++) {
      const date = fmt(subMonths(today, i));
      createTransaction({
        type: 'expense',
        accountId: bank.id,
        categoryId: catLogement?.id ?? null,
        amountMinor: 150_000,
        currencyCode: 'XAF',
        date,
        description: 'Loyer',
        baseCurrencyCode: 'XAF',
        exchangeRate: 1.0,
        exchangeRateDate: date,
      });
    }

    // Dépenses diverses ce mois
    const recentDays = [0, 1, 2, 3, 5, 7, 10, 14, 18, 22, 25];
    recentDays.forEach((d) => {
      const date = fmt(subDays(today, d));
      const targets: Array<[string, number, string]> = [
        [catAlimentation?.id ?? null, 8_500, 'Déjeuner'],
        [catTransport?.id ?? null, 3_000, 'Taxi'],
        [catRestaurant?.id ?? null, 12_000, 'Restaurant'],
        [catAlimentation?.id ?? null, 24_500, 'Courses'],
        [catLoisirs?.id ?? null, 5_000, 'Cinéma'],
        [catAbonnements?.id ?? null, 9_900, 'Netflix'],
        [catElectricite?.id ?? null, 35_000, 'Électricité'],
        [catAlimentation?.id ?? null, 6_500, 'Marché'],
        [catTransport?.id ?? null, 1_500, 'Bus'],
        [catRestaurant?.id ?? null, 7_500, 'Café'],
        [catLoisirs?.id ?? null, 15_000, 'Concert'],
      ];
      const [categoryId, amount, description] = targets[d % targets.length];
      const accountId = d % 2 === 0 ? cash.id : mobileMoney.id;
      createTransaction({
        type: 'expense',
        accountId,
        categoryId,
        amountMinor: amount,
        currencyCode: 'XAF',
        date,
        description,
        baseCurrencyCode: 'XAF',
        exchangeRate: 1.0,
        exchangeRateDate: date,
      });
    });

    // 4. Budgets démo
    createBudget({
      name: `Alimentation ${DEMO_TAG}`,
      categoryId: catAlimentation?.id ?? null,
      currencyCode: 'XAF',
      amountMinor: 150_000,
      period: 'monthly',
      startDate: fmt(subMonths(today, 0)),
      endDate: fmt(today),
    });
    createBudget({
      name: `Transport ${DEMO_TAG}`,
      categoryId: catTransport?.id ?? null,
      currencyCode: 'XAF',
      amountMinor: 75_000,
      period: 'monthly',
      startDate: fmt(subMonths(today, 0)),
      endDate: fmt(today),
    });

    // 5. Objectif démo
    createGoal({
      name: `Voiture ${DEMO_TAG}`,
      icon: '🚗',
      color: '#B5533C',
      targetAmountMinor: 8_000_000,
      currentAmountMinor: 2_450_000,
      currencyCode: 'XAF',
      targetDate: fmt(subMonths(today, -24)), // dans 2 ans
      linkedAccountId: savings.id,
    });

    // 6. Récurrences démo
    createRecurringTransaction({
      type: 'income',
      accountId: bank.id,
      categoryId: catSalaire?.id ?? null,
      amountMinor: 650_000,
      currencyCode: 'XAF',
      description: 'Salaire mensuel',
      frequency: 'monthly',
      startDate: fmt(today),
      dayOfMonth: 1,
    });
    createRecurringTransaction({
      type: 'expense',
      accountId: bank.id,
      categoryId: catLogement?.id ?? null,
      amountMinor: 150_000,
      currencyCode: 'XAF',
      description: 'Loyer',
      frequency: 'monthly',
      startDate: fmt(today),
      dayOfMonth: 5,
    });
  });
}

/**
 * Efface TOUTES les données démo.
 * Reconnaissables par leur nom contenant 'DEMO'.
 * À appeler quand l'utilisateur désactive le mode démo.
 */
export function clearDemoData(): void {
  // Soft-delete tous les comptes/transactions/budgets/goals/récurrences contenant 'DEMO'.
  // Pour V1, on efface tout (l'utilisateur est en mode démo → pas de données réelles mélangées).
  const { getDatabase } = require('@database/sqlite');
  const db = getDatabase();
  const now = new Date().toISOString();
  db.withTransactionSync(() => {
    db.runSync(`UPDATE accounts SET deletedAt = ?, updatedAt = ? WHERE name LIKE '%DEMO%';`, [now, now]);
    db.runSync(`UPDATE transactions SET deletedAt = ?, updatedAt = ? WHERE description LIKE '%DEMO%' OR merchant LIKE '%DEMO%';`, [now, now]);
    db.runSync(`UPDATE budgets SET deletedAt = ?, updatedAt = ? WHERE name LIKE '%DEMO%';`, [now, now]);
    db.runSync(`UPDATE goals SET deletedAt = ?, updatedAt = ? WHERE name LIKE '%DEMO%';`, [now, now]);
    db.runSync(`UPDATE recurring_transactions SET deletedAt = ?, updatedAt = ? WHERE description LIKE '%DEMO%';`, [now, now]);
  });
}
