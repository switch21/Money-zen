/**
 * Money-zen — Repository : Recurring Transactions.
 * Spec section 23 : salaire, loyer, abonnement, etc.
 * Règle : ne jamais créer automatiquement des doublons (prévention via occurrencesGenerated).
 */
import { getDatabase } from '@database/sqlite';
import type {
  CurrencyCode,
  ISODateString,
  MoneyMinor,
  RecurringFrequency,
  RecurringTransaction,
  TransactionType,
} from '@types/index';
import { addDays, addWeeks, addMonths, addYears, format, parseISO } from 'date-fns';
import { mapSyncableFields, syncableCreateFields, toBoolean, toInt, toNumber, toString } from './_helpers';

type RecurringRow = Omit<RecurringTransaction, 'isArchived'> & { isArchived: number };

function mapRow(row: RecurringRow): RecurringTransaction {
  return {
    ...mapSyncableFields(row),
    type: row.type as TransactionType,
    accountId: row.accountId,
    categoryId: row.categoryId ?? null,
    amountMinor: toNumber(row.amountMinor),
    currencyCode: row.currencyCode as CurrencyCode,
    description: toString(row.description),
    frequency: row.frequency as RecurringFrequency,
    startDate: toString(row.startDate),
    endDate: row.endDate ?? null,
    dayOfMonth: row.dayOfMonth ?? undefined,
    occurrencesGenerated: toNumber(row.occurrencesGenerated),
    nextOccurrence: row.nextOccurrence ?? null,
    isArchived: toBoolean(row.isArchived),
  };
}

export function getRecurringById(id: string): RecurringTransaction | null {
  const db = getDatabase();
  const row = db.getFirstSync<RecurringRow>(`SELECT * FROM recurring_transactions WHERE id = ? AND deletedAt IS NULL;`, [id]);
  return row ? mapRow(row) : null;
}

export function listRecurringTransactions(includeArchived = false): RecurringTransaction[] {
  const db = getDatabase();
  const clause = includeArchived ? '' : 'AND isArchived = 0';
  const rows = db.getAllSync<RecurringRow>(
    `SELECT * FROM recurring_transactions WHERE deletedAt IS NULL ${clause} ORDER BY nextOccurrence ASC;`,
  );
  return rows.map(mapRow);
}

interface CreateRecurringInput {
  type: TransactionType;
  accountId: string;
  categoryId?: string | null;
  amountMinor: MoneyMinor;
  currencyCode: CurrencyCode;
  description: string;
  frequency: RecurringFrequency;
  startDate: ISODateString;
  endDate?: ISODateString | null;
  dayOfMonth?: number;
}

export function createRecurringTransaction(input: CreateRecurringInput): RecurringTransaction {
  const fields = syncableCreateFields();
  const db = getDatabase();
  const nextOccurrence = computeNextOccurrence(input.startDate, input.frequency, input.dayOfMonth);
  db.runSync(
    `INSERT INTO recurring_transactions
     (id, type, accountId, categoryId, amountMinor, currencyCode, description,
      frequency, startDate, endDate, dayOfMonth, occurrencesGenerated, nextOccurrence,
      isArchived, createdAt, updatedAt, deletedAt, syncStatus, version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?, NULL, ?, ?);`,
    [
      fields.id,
      input.type,
      input.accountId,
      input.categoryId ?? null,
      input.amountMinor,
      input.currencyCode,
      input.description,
      input.frequency,
      input.startDate,
      input.endDate ?? null,
      input.dayOfMonth ?? null,
      nextOccurrence,
      fields.createdAt,
      fields.updatedAt,
      fields.syncStatus,
      fields.version,
    ],
  );
  return getRecurringById(fields.id)!;
}

export function archiveRecurring(id: string): void {
  const db = getDatabase();
  db.runSync(`UPDATE recurring_transactions SET isArchived = 1, updatedAt = ? WHERE id = ?;`, [
    new Date().toISOString(),
    id,
  ]);
}

export function updateNextOccurrence(id: string, date: ISODateString | null): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE recurring_transactions SET nextOccurrence = ?, occurrencesGenerated = occurrencesGenerated + 1, updatedAt = ? WHERE id = ?;`,
    [date, new Date().toISOString(), id],
  );
}

/**
 * Calcule la prochaine occurrence d'une récurrence.
 * Spec section 23 : fréquences daily/weekly/monthly/quarterly/yearly.
 */
export function computeNextOccurrence(
  fromDateISO: ISODateString,
  frequency: RecurringFrequency,
  dayOfMonth?: number,
): ISODateString {
  const fromDate = parseISO(fromDateISO);
  let nextDate: Date;
  switch (frequency) {
    case 'daily':
      nextDate = addDays(fromDate, 1);
      break;
    case 'weekly':
      nextDate = addWeeks(fromDate, 1);
      break;
    case 'monthly':
      nextDate = addMonths(fromDate, 1);
      if (dayOfMonth && dayOfMonth !== fromDate.getDate()) {
        nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), Math.min(dayOfMonth, 28));
      }
      break;
    case 'quarterly':
      nextDate = addMonths(fromDate, 3);
      break;
    case 'yearly':
      nextDate = addYears(fromDate, 1);
      break;
  }
  return format(nextDate, 'yyyy-MM-dd');
}

/**
 * Retourne toutes les récurrences dont la prochaine occurrence est dans le passé.
 * Le scheduler (Phase 12) appellera cette fonction périodiquement.
 */
export function listDueRecurringTransactions(asOf: ISODateString = new Date().toISOString()): RecurringTransaction[] {
  const db = getDatabase();
  const rows = db.getAllSync<RecurringRow>(
    `SELECT * FROM recurring_transactions
     WHERE deletedAt IS NULL AND isArchived = 0
       AND nextOccurrence IS NOT NULL AND nextOccurrence <= ?
       AND (endDate IS NULL OR endDate >= nextOccurrence);`,
    [asOf.slice(0, 10)], // YYYY-MM-DD
  );
  return rows.map(mapRow);
}
