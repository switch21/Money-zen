/**
 * Money-zen — Repository : Transaction Transfers (règle 11).
 * Spécificité : un transfert crée 1 transaction `type=transfer` + 1 row transaction_transfers.
 * Pas de paire miroir en V1 (une seule transaction, on lit source/dest via la row transfer).
 *
 * Spec section 19 : interface dédiée, frais éventuels séparés.
 * Règle 7 : les transferts ne sont pas inclus dans les dépenses.
 */
import { getDatabase, withTransaction } from '@database/sqlite';
import type {
  CurrencyCode,
  ISODateString,
  MoneyMinor,
  Transaction,
  TransactionTransfer,
} from '@types/index';
import { MoneyZenError } from '@types/index';
import { getAccountById, recalculateBalance } from './accountRepository';
import { assertCurrencyExists, getCurrencyByCode } from './currencyRepository';
import { createTransaction, softDeleteTransaction, getTransactionById } from './transactionRepository';
import { mapSyncableFields, syncableCreateFields, toNumber, toString } from './_helpers';

type TransferRow = Omit<TransactionTransfer, 'feeTransactionId'> & { feeTransactionId: string | null };

function mapRow(row: TransferRow): TransactionTransfer {
  return {
    id: toString(row.id),
    transactionId: toString(row.transactionId),
    sourceAccountId: toString(row.sourceAccountId),
    destinationAccountId: toString(row.destinationAccountId),
    sourceAmountMinor: toNumber(row.sourceAmountMinor),
    sourceCurrency: toString(row.sourceCurrency),
    destinationAmountMinor: toNumber(row.destinationAmountMinor),
    destinationCurrency: toString(row.destinationCurrency),
    exchangeRate: toNumber(row.exchangeRate),
    exchangeRateDate: row.exchangeRateDate ?? null,
    feeTransactionId: row.feeTransactionId ?? null,
    createdAt: toString(row.createdAt),
  };
}

export interface CreateTransferInput {
  sourceAccountId: string;
  destinationAccountId: string;
  sourceAmountMinor: MoneyMinor;
  sourceCurrency: CurrencyCode;
  destinationCurrency: CurrencyCode;
  exchangeRate: number; // 1 sourceCurrency = rate destinationCurrency
  date: ISODateString;
  baseCurrencyCode: CurrencyCode;
  description?: string;
  notes?: string;
  feeAmountMinor?: MoneyMinor | null; // Optionnel : génère une dépense séparée
}

export function createTransfer(input: CreateTransferInput): { transaction: Transaction; transfer: TransactionTransfer } {
  // Validations
  if (input.sourceAccountId === input.destinationAccountId) {
    throw new MoneyZenError('TRANSFER_SAME_ACCOUNT', 'Source et destination doivent être différents.');
  }
  if (input.sourceAmountMinor <= 0) {
    throw new MoneyZenError('INVALID_AMOUNT', 'Le montant doit être > 0.');
  }
  const sourceAccount = getAccountById(input.sourceAccountId);
  if (!sourceAccount) throw new MoneyZenError('ACCOUNT_NOT_FOUND', 'Compte source introuvable.');
  const destAccount = getAccountById(input.destinationAccountId);
  if (!destAccount) throw new MoneyZenError('ACCOUNT_NOT_FOUND', 'Compte destination introuvable.');

  assertCurrencyExists(input.sourceCurrency);
  assertCurrencyExists(input.destinationCurrency);
  assertCurrencyExists(input.baseCurrencyCode);

  const sourceCurrency = getCurrencyByCode(input.sourceCurrency)!;
  const destCurrency = getCurrencyByCode(input.destinationCurrency)!;

  // Calcul du montant destination à partir du taux.
  const sourceMajor = input.sourceAmountMinor / Math.pow(10, sourceCurrency.decimals);
  const destinationMajor = sourceMajor * input.exchangeRate;
  const destinationAmountMinor = Math.round(destinationMajor * Math.pow(10, destCurrency.decimals));

  const db = getDatabase();
  const fields = syncableCreateFields();

  // Étape 1 : créer la transaction `type=transfer` (avec accountId = source).
  const transaction = createTransaction({
    type: 'transfer',
    accountId: input.sourceAccountId,
    categoryId: null,
    amountMinor: input.sourceAmountMinor,
    currencyCode: input.sourceCurrency,
    date: input.date,
    description: input.description ?? '',
    notes: input.notes,
    baseCurrencyCode: input.baseCurrencyCode,
    exchangeRate: input.exchangeRate,
    exchangeRateDate: input.date,
  });

  let feeTransactionId: string | null = null;

  withTransaction(() => {
    // Étape 2 : créer la row transaction_transfers.
    db.runSync(
      `INSERT INTO transaction_transfers
       (id, transactionId, sourceAccountId, destinationAccountId,
        sourceAmountMinor, sourceCurrency, destinationAmountMinor, destinationCurrency,
        exchangeRate, exchangeRateDate, feeTransactionId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        fields.id,
        transaction.id,
        input.sourceAccountId,
        input.destinationAccountId,
        input.sourceAmountMinor,
        input.sourceCurrency,
        destinationAmountMinor,
        input.destinationCurrency,
        input.exchangeRate,
        input.date,
        feeTransactionId,
        fields.createdAt,
      ],
    );

    // Étape 3 : si frais, créer une dépense séparée.
    if (input.feeAmountMinor && input.feeAmountMinor > 0) {
      const feeTx = createTransaction({
        type: 'expense',
        accountId: input.sourceAccountId,
        categoryId: null, // l'appelant choisira la catégorie "Frais de transfert" si elle existe
        amountMinor: input.feeAmountMinor,
        currencyCode: input.sourceCurrency,
        date: input.date,
        description: 'Frais de transfert',
        baseCurrencyCode: input.baseCurrencyCode,
        exchangeRate: 1.0, // frais en devise source
        exchangeRateDate: input.date,
      });
      feeTransactionId = feeTx.id;
      db.runSync(
        `UPDATE transaction_transfers SET feeTransactionId = ? WHERE id = ?;`,
        [feeTransactionId, fields.id],
      );
    }

    // Étape 4 : recalculer les soldes source ET destination.
    recalculateBalance(input.sourceAccountId);
    recalculateBalance(input.destinationAccountId);
  });

  const transferRow = db.getFirstSync<TransferRow>(
    `SELECT * FROM transaction_transfers WHERE id = ?;`,
    [fields.id],
  );
  if (!transferRow) {
    throw new MoneyZenError('UNKNOWN', 'Transfer row introuvable après création.');
  }
  return { transaction, transfer: mapRow(transferRow) };
}

export function getTransferByTransactionId(transactionId: string): TransactionTransfer | null {
  const db = getDatabase();
  const row = db.getFirstSync<TransferRow>(
    `SELECT * FROM transaction_transfers WHERE transactionId = ?;`,
    [transactionId],
  );
  return row ? mapRow(row) : null;
}

export function softDeleteTransfer(transactionId: string): void {
  softDeleteTransaction(transactionId);
  // recalculateBalance est appelé par softDeleteTransaction, mais on doit aussi recalculer dest.
  const transfer = getTransferByTransactionId(transactionId);
  if (transfer) {
    recalculateBalance(transfer.destinationAccountId);
  }
}
