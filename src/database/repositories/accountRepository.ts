/**
 * Money-zen — Repository : Account.
 * Spec section 17 : comptes multidevise, solde recalculé depuis le journal.
 * Spec section 18 : Mobile Money (Orange Money, MTN MoMo, etc.).
 * Spec section 35 : pas de suppression physique, archivage.
 */
import { getDatabase, withTransaction } from '@database/sqlite';
import type { Account, AccountType, MobileMoneyProvider, MoneyMinor } from '@types/index';
import { MoneyZenError } from '@types/index';
import { assertCurrencyExists } from './currencyRepository';
import { mapSyncableFields, syncableCreateFields, toBoolean, toInt, toNullableString } from './_helpers';

type AccountRow = Omit<Account, 'isArchived'> & { isArchived: number };

function mapRow(row: AccountRow): Account {
  return {
    ...mapSyncableFields(row),
    name: row.name,
    type: row.type as AccountType,
    currency: row.currency,
    initialBalanceMinor: row.initialBalanceMinor,
    currentBalanceMinor: row.currentBalanceMinor,
    icon: row.icon,
    color: row.color,
    mobileMoneyProvider: (row.mobileMoneyProvider as MobileMoneyProvider | null) ?? undefined,
    maskedNumber: row.maskedNumber ?? undefined,
    notes: row.notes ?? undefined,
    isArchived: toBoolean(row.isArchived),
  };
}

export function getAccountById(id: string): Account | null {
  const db = getDatabase();
  const row = db.getFirstSync<AccountRow>(`SELECT * FROM accounts WHERE id = ? AND deletedAt IS NULL;`, [id]);
  return row ? mapRow(row) : null;
}

export function listAccounts(includeArchived = false): Account[] {
  const db = getDatabase();
  const clause = includeArchived ? '' : 'AND isArchived = 0';
  const rows = db.getAllSync<AccountRow>(
    `SELECT * FROM accounts WHERE deletedAt IS NULL ${clause} ORDER BY createdAt ASC;`,
  );
  return rows.map(mapRow);
}

export function listAccountsByCurrency(currency: string): Account[] {
  const db = getDatabase();
  const rows = db.getAllSync<AccountRow>(
    `SELECT * FROM accounts WHERE currency = ? AND deletedAt IS NULL AND isArchived = 0 ORDER BY name;`,
    [currency],
  );
  return rows.map(mapRow);
}

interface CreateAccountInput {
  name: string;
  type: AccountType;
  currency: string;
  initialBalanceMinor: MoneyMinor;
  icon?: string;
  color?: string;
  mobileMoneyProvider?: MobileMoneyProvider;
  maskedNumber?: string;
  notes?: string;
}

export function createAccount(input: CreateAccountInput): Account {
  // Validation
  if (!input.name || input.name.trim().length === 0) {
    throw new MoneyZenError('INVALID_AMOUNT', 'Le nom du compte est requis.');
  }
  assertCurrencyExists(input.currency);
  if (input.initialBalanceMinor < 0) {
    throw new MoneyZenError('INVALID_AMOUNT', 'Le solde initial ne peut pas être négatif.');
  }
  if (input.type === 'mobile_money' && !input.mobileMoneyProvider) {
    throw new MoneyZenError('INVALID_CURRENCY', 'Type Mobile Money requiert mobileMoneyProvider.');
  }

  const fields = syncableCreateFields();
  const db = getDatabase();
  withTransaction(() => {
    db.runSync(
      `INSERT INTO accounts
       (id, name, type, currency, initialBalanceMinor, currentBalanceMinor, icon, color,
        mobileMoneyProvider, maskedNumber, notes, isArchived, createdAt, updatedAt, deletedAt, syncStatus, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NULL, ?, ?);`,
      [
        fields.id,
        input.name.trim(),
        input.type,
        input.currency,
        input.initialBalanceMinor,
        input.initialBalanceMinor, // currentBalance initialisé = initialBalance
        input.icon ?? '💵',
        input.color ?? '#C97048',
        input.mobileMoneyProvider ?? null,
        input.maskedNumber ?? null,
        input.notes ?? null,
        fields.createdAt,
        fields.updatedAt,
        fields.syncStatus,
        fields.version,
      ],
    );
  });
  return getAccountById(fields.id)!;
}

export function updateAccount(
  id: string,
  patch: Partial<Pick<Account, 'name' | 'icon' | 'color' | 'maskedNumber' | 'notes'>>,
): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    values.push(patch.name);
  }
  if (patch.icon !== undefined) {
    sets.push('icon = ?');
    values.push(patch.icon);
  }
  if (patch.color !== undefined) {
    sets.push('color = ?');
    values.push(patch.color);
  }
  if (patch.maskedNumber !== undefined) {
    sets.push('maskedNumber = ?');
    values.push(patch.maskedNumber);
  }
  if (patch.notes !== undefined) {
    sets.push('notes = ?');
    values.push(patch.notes);
  }
  sets.push('updatedAt = ?');
  values.push(now);
  values.push(id);
  db.runSync(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?;`, values);
}

export function archiveAccount(id: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.runSync(`UPDATE accounts SET isArchived = 1, updatedAt = ? WHERE id = ?;`, [now, id]);
}

export function unarchiveAccount(id: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.runSync(`UPDATE accounts SET isArchived = 0, updatedAt = ? WHERE id = ?;`, [now, id]);
}

/**
 * Recalcule le solde courant d'un compte à partir du journal des transactions.
 * Spec section 17 : "Le solde courant doit être calculable à partir du journal des opérations."
 *
 * Formule :
 *   currentBalance = initialBalance
 *     + Σ(income.amount) - Σ(expense.amount)
 *     + Σ(transfers in) - Σ(transfers out)
 *
 * Pour les transferts, on lit transaction_transfers.
 */
export function recalculateBalance(accountId: string): MoneyMinor {
  const db = getDatabase();
  const account = getAccountById(accountId);
  if (!account) {
    throw new MoneyZenError('ACCOUNT_NOT_FOUND', `Compte introuvable : ${accountId}`);
  }

  let balance = account.initialBalanceMinor;

  // Revenus : +amount (en unités mineures du compte, car même devise ou converti)
  const incomesRow = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(amountMinor), 0) AS total FROM transactions
     WHERE accountId = ? AND type = 'income' AND deletedAt IS NULL;`,
    [accountId],
  );
  balance += incomesRow?.total ?? 0;

  // Dépenses : -amount
  const expensesRow = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(amountMinor), 0) AS total FROM transactions
     WHERE accountId = ? AND type = 'expense' AND deletedAt IS NULL;`,
    [accountId],
  );
  balance -= expensesRow?.total ?? 0;

  // Transferts sortants : -sourceAmount (en devise source = devise du compte source)
  const transfersOutRow = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(tt.sourceAmountMinor), 0) AS total
     FROM transaction_transfers tt
     JOIN transactions t ON t.id = tt.transactionId
     WHERE tt.sourceAccountId = ? AND t.deletedAt IS NULL;`,
    [accountId],
  );
  balance -= transfersOutRow?.total ?? 0;

  // Transferts entrants : +destinationAmount (en devise destination = devise du compte destination)
  const transfersInRow = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(tt.destinationAmountMinor), 0) AS total
     FROM transaction_transfers tt
     JOIN transactions t ON t.id = tt.transactionId
     WHERE tt.destinationAccountId = ? AND t.deletedAt IS NULL;`,
    [accountId],
  );
  balance += transfersInRow?.total ?? 0;

  // Persiste le solde recalculé.
  db.runSync(
    `UPDATE accounts SET currentBalanceMinor = ?, updatedAt = ? WHERE id = ?;`,
    [balance, new Date().toISOString(), accountId],
  );
  return balance;
}

/** Recalcule les soldes de tous les comptes (utile après import ou sync). */
export function recalculateAllBalances(): void {
  withTransaction(() => {
    const accounts = listAccounts(true);
    for (const a of accounts) {
      recalculateBalance(a.id);
    }
  });
}
