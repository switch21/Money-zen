/**
 * Money-zen — Repository : Transaction.
 *
 * Règles métier critiques (spec section 49) :
 *   R1. Dépense réduit le solde.
 *   R2. Revenu augmente le solde.
 *   R3. Transfert ne compte pas comme revenu/dépense.
 *   R4. Conversion multidevise conserve le taux historique.
 *   R8. Les anciennes transactions ne changent pas quand les taux évoluent.
 *   R9. Montant > 0 obligatoire.
 */
import { getDatabase, withTransaction } from '@database/sqlite';
import type {
  CurrencyCode,
  ISODateString,
  MoneyMinor,
  Transaction,
  TransactionType,
} from '@types/index';
import { MoneyZenError } from '@types/index';
import { getAccountById, recalculateBalance } from './accountRepository';
import { assertCurrencyExists, getCurrencyByCode } from './currencyRepository';
import { getCategoryById } from './categoryRepository';
import { mapSyncableFields, syncableCreateFields, toBoolean, toInt, toNullableString, toNumber, toString } from './_helpers';

type TransactionRow = Omit<Transaction, 'isRecurring'> & { isRecurring: number };

function mapRow(row: TransactionRow): Transaction {
  return {
    ...mapSyncableFields(row),
    type: row.type as TransactionType,
    accountId: row.accountId,
    categoryId: toNullableString(row.categoryId) ?? null,
    amountMinor: toNumber(row.amountMinor),
    currencyCode: row.currencyCode,
    convertedAmountMinor: toNumber(row.convertedAmountMinor),
    baseCurrencyCode: row.baseCurrencyCode,
    exchangeRate: toNumber(row.exchangeRate),
    exchangeRateDate: toNullableString(row.exchangeRateDate),
    date: toString(row.date),
    description: toString(row.description),
    notes: toNullableString(row.notes) ?? undefined,
    merchant: toNullableString(row.merchant) ?? undefined,
    receiptId: toNullableString(row.receiptId) ?? null,
    isRecurring: toBoolean(row.isRecurring),
    recurringTransactionId: toNullableString(row.recurringTransactionId) ?? null,
    transferPairId: toNullableString(row.transferPairId) ?? null,
  };
}

// ─── Création ────────────────────────────────────────────────────────────────

interface CreateTransactionInput {
  type: TransactionType;
  accountId: string;
  categoryId?: string | null;
  amountMinor: MoneyMinor;
  currencyCode: CurrencyCode;
  date: ISODateString;
  description?: string;
  notes?: string;
  merchant?: string;
  baseCurrencyCode: CurrencyCode;
  exchangeRate: number;
  exchangeRateDate?: ISODateString | null;
  receiptId?: string | null;
  recurringTransactionId?: string | null;
}

export function createTransaction(input: CreateTransactionInput): Transaction {
  // Validations métier (spec section 34)
  if (input.amountMinor <= 0) {
    throw new MoneyZenError('INVALID_AMOUNT', 'Le montant doit être strictement positif.');
  }
  const account = getAccountById(input.accountId);
  if (!account) {
    throw new MoneyZenError('ACCOUNT_NOT_FOUND', `Compte introuvable : ${input.accountId}`);
  }
  assertCurrencyExists(input.currencyCode);
  assertCurrencyExists(input.baseCurrencyCode);

  if (input.type === 'expense' && !input.categoryId) {
    throw new MoneyZenError('INVALID_CURRENCY', 'La catégorie est requise pour une dépense.');
  }
  if (input.type === 'income' && !input.categoryId) {
    throw new MoneyZenError('INVALID_CURRENCY', 'La catégorie est requise pour un revenu.');
  }
  if (input.categoryId) {
    const category = getCategoryById(input.categoryId);
    if (!category) {
      throw new MoneyZenError('CATEGORY_NOT_FOUND', `Catégorie introuvable : ${input.categoryId}`);
    }
  }

  const fromCurrency = getCurrencyByCode(input.currencyCode);
  const baseCurrency = getCurrencyByCode(input.baseCurrencyCode);
  if (!fromCurrency || !baseCurrency) {
    throw new MoneyZenError('INVALID_CURRENCY', 'Devise non reconnue.');
  }

  // Calcul du montant converti en unités mineures de la devise principale.
  const sourceMajor = input.amountMinor / Math.pow(10, fromCurrency.decimals);
  const targetMajor = sourceMajor * input.exchangeRate;
  const convertedAmountMinor = Math.round(targetMajor * Math.pow(10, baseCurrency.decimals));

  const fields = syncableCreateFields();
  const db = getDatabase();

  withTransaction(() => {
    db.runSync(
      `INSERT INTO transactions
       (id, type, accountId, categoryId, amountMinor, currencyCode, convertedAmountMinor,
        baseCurrencyCode, exchangeRate, exchangeRateDate, date, description, notes, merchant,
        receiptId, isRecurring, recurringTransactionId, transferPairId,
        createdAt, updatedAt, deletedAt, syncStatus, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?);`,
      [
        fields.id,
        input.type,
        input.accountId,
        input.categoryId ?? null,
        input.amountMinor,
        input.currencyCode,
        convertedAmountMinor,
        input.baseCurrencyCode,
        input.exchangeRate,
        input.exchangeRateDate ?? null,
        input.date,
        input.description ?? '',
        input.notes ?? null,
        input.merchant ?? null,
        input.receiptId ?? null,
        toInt(false),
        input.recurringTransactionId ?? null,
        null, // transferPairId — géré par transferRepository
        fields.createdAt,
        fields.updatedAt,
        fields.syncStatus,
        fields.version,
      ],
    );

    // Recalcule le solde du compte concerné.
    recalculateBalance(input.accountId);
  });

  return getTransactionById(fields.id)!;
}

export function getTransactionById(id: string): Transaction | null {
  const db = getDatabase();
  const row = db.getFirstSync<TransactionRow>(`SELECT * FROM transactions WHERE id = ?;`, [id]);
  return row ? mapRow(row) : null;
}

// ─── Modification ────────────────────────────────────────────────────────────

interface UpdateTransactionPatch {
  amountMinor?: MoneyMinor;
  categoryId?: string | null;
  description?: string;
  notes?: string;
  merchant?: string;
  date?: ISODateString;
  exchangeRate?: number;
  exchangeRateDate?: ISODateString | null;
}

export function updateTransaction(id: string, patch: UpdateTransactionPatch): Transaction {
  const existing = getTransactionById(id);
  if (!existing) {
    throw new MoneyZenError('UNKNOWN', `Transaction introuvable : ${id}`);
  }
  if (existing.type === 'transfer') {
    throw new MoneyZenError('UNKNOWN', 'Les transferts doivent être modifiés via transferRepository.');
  }

  const db = getDatabase();
  const now = new Date().toISOString();
  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  if (patch.amountMinor !== undefined) {
    if (patch.amountMinor <= 0) throw new MoneyZenError('INVALID_AMOUNT', 'Montant doit être > 0.');
    sets.push('amountMinor = ?');
    values.push(patch.amountMinor);
  }
  if (patch.categoryId !== undefined) {
    sets.push('categoryId = ?');
    values.push(patch.categoryId);
  }
  if (patch.description !== undefined) {
    sets.push('description = ?');
    values.push(patch.description);
  }
  if (patch.notes !== undefined) {
    sets.push('notes = ?');
    values.push(patch.notes);
  }
  if (patch.merchant !== undefined) {
    sets.push('merchant = ?');
    values.push(patch.merchant);
  }
  if (patch.date !== undefined) {
    sets.push('date = ?');
    values.push(patch.date);
  }
  if (patch.exchangeRate !== undefined) {
    sets.push('exchangeRate = ?');
    values.push(patch.exchangeRate);
    // Recalcul convertedAmountMinor si le taux change.
    const fromCurrency = getCurrencyByCode(existing.currencyCode)!;
    const baseCurrency = getCurrencyByCode(existing.baseCurrencyCode)!;
    const sourceMajor = (patch.amountMinor ?? existing.amountMinor) / Math.pow(10, fromCurrency.decimals);
    const targetMajor = sourceMajor * patch.exchangeRate;
    const newConverted = Math.round(targetMajor * Math.pow(10, baseCurrency.decimals));
    sets.push('convertedAmountMinor = ?');
    values.push(newConverted);
  }
  if (patch.exchangeRateDate !== undefined) {
    sets.push('exchangeRateDate = ?');
    values.push(patch.exchangeRateDate);
  }
  sets.push('updatedAt = ?');
  values.push(now);
  values.push(id);

  withTransaction(() => {
    db.runSync(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ?;`, values);
    recalculateBalance(existing.accountId);
  });

  return getTransactionById(id)!;
}

// ─── Suppression / archivage ────────────────────────────────────────────────

export function softDeleteTransaction(id: string): void {
  const existing = getTransactionById(id);
  if (!existing) return;
  const db = getDatabase();
  const now = new Date().toISOString();
  withTransaction(() => {
    db.runSync(
      `UPDATE transactions SET deletedAt = ?, updatedAt = ? WHERE id = ?;`,
      [now, now, id],
    );
    recalculateBalance(existing.accountId);
    // Si c'était un transfert, on soft-delete aussi la row transfer et le pair.
    if (existing.type === 'transfer' && existing.transferPairId) {
      db.runSync(`UPDATE transaction_transfers SET deletedAt = ?, updatedAt = ? WHERE transactionId = ? OR transactionId = ?;`, [
        now,
        now,
        id,
        existing.transferPairId,
      ]);
      db.runSync(`UPDATE transactions SET deletedAt = ?, updatedAt = ? WHERE id = ?;`, [
        now,
        now,
        existing.transferPairId,
      ]);
      // Recalcule le 2e compte concerné.
      const tt = db.getFirstSync<{ sourceAccountId: string; destinationAccountId: string }>(
        `SELECT sourceAccountId, destinationAccountId FROM transaction_transfers WHERE transactionId = ?;`,
        [id],
      );
      if (tt) {
        recalculateBalance(tt.sourceAccountId);
        recalculateBalance(tt.destinationAccountId);
      }
    }
  });
}

// ─── Listing avec filtres + pagination ──────────────────────────────────────

export interface TransactionFilters {
  type?: TransactionType | 'all';
  accountId?: string | null;
  categoryId?: string | null;
  currencyCode?: CurrencyCode | null;
  dateFrom?: ISODateString | null;
  dateTo?: ISODateString | null;
  search?: string | null;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export function listTransactions(filters: TransactionFilters = {}): Transaction[] {
  const db = getDatabase();
  const clauses: string[] = [];
  const values: (string | number)[] = [];

  if (!filters.includeArchived) {
    clauses.push('deletedAt IS NULL');
  }
  if (filters.type && filters.type !== 'all') {
    clauses.push('type = ?');
    values.push(filters.type);
  }
  if (filters.accountId) {
    clauses.push('accountId = ?');
    values.push(filters.accountId);
  }
  if (filters.categoryId) {
    clauses.push('categoryId = ?');
    values.push(filters.categoryId);
  }
  if (filters.currencyCode) {
    clauses.push('currencyCode = ?');
    values.push(filters.currencyCode);
  }
  if (filters.dateFrom) {
    clauses.push('date >= ?');
    values.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    clauses.push('date <= ?');
    values.push(filters.dateTo);
  }
  if (filters.search && filters.search.trim().length >= 2) {
    clauses.push('(description LIKE ? OR merchant LIKE ? OR notes LIKE ?)');
    const term = `%${filters.search.trim()}%`;
    values.push(term, term, term);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  values.push(limit, offset);

  const rows = db.getAllSync<TransactionRow>(
    `SELECT * FROM transactions ${where} ORDER BY date DESC LIMIT ? OFFSET ?;`,
    values,
  );
  return rows.map(mapRow);
}

export interface TransactionAggregate {
  totalIncomeMinor: MoneyMinor;
  totalExpenseMinor: MoneyMinor;
  netMinor: MoneyMinor;
  count: number;
}

export function aggregateTransactionsForPeriod(
  accountId?: string | null,
  dateFrom?: ISODateString | null,
  dateTo?: ISODateString | null,
): TransactionAggregate {
  const db = getDatabase();
  const clauses: string[] = ['deletedAt IS NULL', "type IN ('income', 'expense')"];
  const values: (string | number)[] = [];
  if (accountId) {
    clauses.push('accountId = ?');
    values.push(accountId);
  }
  if (dateFrom) {
    clauses.push('date >= ?');
    values.push(dateFrom);
  }
  if (dateTo) {
    clauses.push('date <= ?');
    values.push(dateTo);
  }
  const where = `WHERE ${clauses.join(' AND ')}`;

  const incomeRow = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(convertedAmountMinor), 0) AS total FROM transactions ${where} AND type = 'income';`,
    values,
  );
  const expenseRow = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(convertedAmountMinor), 0) AS total FROM transactions ${where} AND type = 'expense';`,
    values,
  );
  const countRow = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM transactions ${where};`,
    values,
  );

  const totalIncome = incomeRow?.total ?? 0;
  const totalExpense = expenseRow?.total ?? 0;
  return {
    totalIncomeMinor: totalIncome,
    totalExpenseMinor: totalExpense,
    netMinor: totalIncome - totalExpense,
    count: countRow?.count ?? 0,
  };
}

/** Dépenses par catégorie (pour dashboard + analytics). */
export function expensesByCategory(dateFrom: ISODateString, dateTo: ISODateString): Array<{
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  totalMinor: MoneyMinor;
  percent: number;
}> {
  const db = getDatabase();
  const rows = db.getAllSync<{
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    total: number;
  }>(
    `SELECT t.categoryId, c.name AS categoryName, c.icon AS categoryIcon, c.color AS categoryColor,
            COALESCE(SUM(t.convertedAmountMinor), 0) AS total
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.categoryId
     WHERE t.type = 'expense' AND t.deletedAt IS NULL
       AND t.date >= ? AND t.date <= ?
     GROUP BY t.categoryId
     ORDER BY total DESC;`,
    [dateFrom, dateTo],
  );
  const grandTotal = rows.reduce((acc, r) => acc + (r.total ?? 0), 0);
  return rows.map((r) => ({
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    categoryIcon: r.categoryIcon,
    categoryColor: r.categoryColor,
    totalMinor: r.total ?? 0,
    percent: grandTotal > 0 ? ((r.total ?? 0) / grandTotal) * 100 : 0,
  }));
}
