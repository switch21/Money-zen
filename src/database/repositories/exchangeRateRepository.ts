/**
 * Money-zen — Repository : ExchangeRate (cache local des taux de change).
 * Spec section 16 : abstraction ExchangeRateService, cache, fallback offline.
 */
import { getDatabase } from '@database/sqlite';
import type { CurrencyCode, ExchangeRate } from '@types/index';
import { mapSyncableFields, syncableCreateFields, toBoolean, toInt, toNumber, toNullableString, toString } from './_helpers';

type ExchangeRateRow = Omit<ExchangeRate, 'isManualOverride'> & { isManualOverride: number };

function mapRow(row: ExchangeRateRow): ExchangeRate {
  return {
    ...mapSyncableFields(row),
    fromCurrency: row.fromCurrency,
    toCurrency: row.toCurrency,
    rate: toNumber(row.rate),
    source: row.source as 'manual' | 'api' | 'last-known',
    rateDate: toString(row.rateDate),
    fetchedAt: toString(row.fetchedAt),
    isManualOverride: toBoolean(row.isManualOverride),
  };
}

export function getLatestRate(from: CurrencyCode, to: CurrencyCode): ExchangeRate | null {
  const db = getDatabase();
  // On cherche la ligne la plus récente par rateDate.
  const row = db.getFirstSync<ExchangeRateRow>(
    `SELECT * FROM exchange_rates
     WHERE fromCurrency = ? AND toCurrency = ? AND deletedAt IS NULL
     ORDER BY rateDate DESC LIMIT 1;`,
    [from, to],
  );
  return row ? mapRow(row) : null;
}

/** Récupère un taux historique pour une date donnée (utilisé pour les transactions existantes). */
export function getRateForDate(from: CurrencyCode, to: CurrencyCode, date: string): ExchangeRate | null {
  const db = getDatabase();
  const row = db.getFirstSync<ExchangeRateRow>(
    `SELECT * FROM exchange_rates
     WHERE fromCurrency = ? AND toCurrency = ? AND rateDate <= ? AND deletedAt IS NULL
     ORDER BY rateDate DESC LIMIT 1;`,
    [from, to, date],
  );
  return row ? mapRow(row) : null;
}

export function upsertRate(input: {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  source: 'manual' | 'api' | 'last-known';
  rateDate: string;
  isManualOverride?: boolean;
}): ExchangeRate {
  const fields = syncableCreateFields();
  const db = getDatabase();
  // Upsert : si la paire + date existe déjà, on update le rate.
  db.runSync(
    `INSERT INTO exchange_rates
     (id, fromCurrency, toCurrency, rate, source, rateDate, fetchedAt, isManualOverride, createdAt, updatedAt, deletedAt, syncStatus, version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
     ON CONFLICT(fromCurrency, toCurrency, rateDate) DO UPDATE SET
       rate = excluded.rate,
       source = excluded.source,
       fetchedAt = excluded.fetchedAt,
       isManualOverride = excluded.isManualOverride,
       updatedAt = excluded.updatedAt;`,
    [
      fields.id,
      input.fromCurrency,
      input.toCurrency,
      input.rate,
      input.source,
      input.rateDate,
      fields.createdAt,
      toInt(input.isManualOverride ?? false),
      fields.createdAt,
      fields.updatedAt,
      fields.syncStatus,
      fields.version,
    ],
  );
  return getLatestRate(input.fromCurrency, input.toCurrency)!;
}

/** Liste tous les taux connus (pour l'écran paramètres/currencies). */
export function listAllRates(): ExchangeRate[] {
  const db = getDatabase();
  const rows = db.getAllSync<ExchangeRateRow>(
    `SELECT * FROM exchange_rates WHERE deletedAt IS NULL ORDER BY rateDate DESC;`,
  );
  return rows.map(mapRow);
}

export function deleteRate(id: string): void {
  const db = getDatabase();
  db.runSync(`UPDATE exchange_rates SET deletedAt = ?, updatedAt = ? WHERE id = ?;`, [
    new Date().toISOString(),
    new Date().toISOString(),
    id,
  ]);
}
