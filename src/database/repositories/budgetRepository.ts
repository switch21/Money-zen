/**
 * Money-zen — Repository : Budget.
 * Spec section 24 : budget par catégorie + période + seuils configurables.
 * Règle 6 : ne comptabilise que les dépenses qui correspondent à sa période et catégorie.
 */
import { getDatabase, withTransaction } from '@database/sqlite';
import type {
  Budget,
  BudgetPeriod,
  BudgetPeriodStatus,
  BudgetStatus,
  CurrencyCode,
  ISODateString,
  MoneyMinor,
} from '@types/index';
import { DEFAULT_BUDGET_THRESHOLDS } from '@constants/index';
import { mapSyncableFields, syncableCreateFields, toBoolean, toInt, toNumber, toString } from './_helpers';

type BudgetRow = Omit<Budget, 'isArchived'> & { isArchived: number };

function mapRow(row: BudgetRow): Budget {
  return {
    ...mapSyncableFields(row),
    name: row.name,
    categoryId: row.categoryId ?? null,
    currencyCode: row.currencyCode as CurrencyCode,
    amountMinor: toNumber(row.amountMinor),
    period: row.period as BudgetPeriod,
    startDate: toString(row.startDate),
    endDate: toString(row.endDate),
    warningThreshold: toNumber(row.warningThreshold),
    alertThreshold: toNumber(row.alertThreshold),
    overThreshold: toNumber(row.overThreshold),
    isArchived: toBoolean(row.isArchived),
  };
}

export function getBudgetById(id: string): Budget | null {
  const db = getDatabase();
  const row = db.getFirstSync<BudgetRow>(`SELECT * FROM budgets WHERE id = ? AND deletedAt IS NULL;`, [id]);
  return row ? mapRow(row) : null;
}

export function listBudgets(includeArchived = false): Budget[] {
  const db = getDatabase();
  const clause = includeArchived ? '' : 'AND isArchived = 0';
  const rows = db.getAllSync<BudgetRow>(
    `SELECT * FROM budgets WHERE deletedAt IS NULL ${clause} ORDER BY name;`,
  );
  return rows.map(mapRow);
}

interface CreateBudgetInput {
  name: string;
  categoryId?: string | null;
  currencyCode: CurrencyCode;
  amountMinor: MoneyMinor;
  period: BudgetPeriod;
  startDate: ISODateString;
  endDate: ISODateString;
  warningThreshold?: number;
  alertThreshold?: number;
  overThreshold?: number;
}

export function createBudget(input: CreateBudgetInput): Budget {
  const fields = syncableCreateFields();
  const db = getDatabase();
  db.runSync(
    `INSERT INTO budgets
     (id, name, categoryId, currencyCode, amountMinor, period, startDate, endDate,
      warningThreshold, alertThreshold, overThreshold, isArchived,
      createdAt, updatedAt, deletedAt, syncStatus, version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NULL, ?, ?);`,
    [
      fields.id,
      input.name,
      input.categoryId ?? null,
      input.currencyCode,
      input.amountMinor,
      input.period,
      input.startDate,
      input.endDate,
      input.warningThreshold ?? DEFAULT_BUDGET_THRESHOLDS.warning,
      input.alertThreshold ?? DEFAULT_BUDGET_THRESHOLDS.alert,
      input.overThreshold ?? DEFAULT_BUDGET_THRESHOLDS.over,
      fields.createdAt,
      fields.updatedAt,
      fields.syncStatus,
      fields.version,
    ],
  );
  return getBudgetById(fields.id)!;
}

export function updateBudget(id: string, patch: Partial<CreateBudgetInput>): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) {
      sets.push(`${k} = ?`);
      values.push(v as string | number | null);
    }
  }
  sets.push('updatedAt = ?');
  values.push(now);
  values.push(id);
  db.runSync(`UPDATE budgets SET ${sets.join(', ')} WHERE id = ?;`, values);
}

export function archiveBudget(id: string): void {
  const db = getDatabase();
  db.runSync(`UPDATE budgets SET isArchived = 1, updatedAt = ? WHERE id = ?;`, [
    new Date().toISOString(),
    id,
  ]);
}

/**
 * Calcule la progression d'un budget sur sa période courante.
 * Spécifie : si categoryId, on filtre les dépenses par catégorie.
 */
export function getBudgetStatus(budget: Budget): BudgetPeriodStatus {
  const db = getDatabase();
  const categoryClause = budget.categoryId ? `AND categoryId = ?` : '';
  const params: (string | number)[] = [budget.currencyCode, budget.startDate, budget.endDate];
  if (budget.categoryId) params.push(budget.categoryId);
  const row = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(convertedAmountMinor), 0) AS total FROM transactions
     WHERE type = 'expense' AND deletedAt IS NULL
       AND baseCurrencyCode = ? AND date >= ? AND date <= ?
       ${categoryClause};`,
    params,
  );
  const spentMinor = row?.total ?? 0;
  const remainingMinor = budget.amountMinor - spentMinor;
  const progressPercent = budget.amountMinor > 0 ? (spentMinor / budget.amountMinor) * 100 : 0;

  let status: BudgetStatus = 'normal';
  if (progressPercent >= budget.overThreshold) status = 'over';
  else if (progressPercent >= budget.alertThreshold) status = 'alert';
  else if (progressPercent >= budget.warningThreshold) status = 'warning';

  return {
    budget,
    spentMinor,
    remainingMinor,
    progressPercent,
    status,
  };
}
