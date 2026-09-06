/**
 * Money-zen — Repository : Currency.
 * Spec section 15-16 : devise = entité centrale du moteur multidevise.
 */
import { getDatabase, withTransaction } from '@database/sqlite';
import { CURRENCY_CATALOG, DEFAULT_CURRENCY_CODES } from '@constants/currencies';
import type { Currency, CurrencyCode } from '@types/index';
import { MoneyZenError } from '@types/index';
import { mapSyncableFields, syncableCreateFields, toBoolean, toInt } from './_helpers';

type CurrencyRow = Omit<Currency, 'isEnabled'> & { isEnabled: number };

function mapRow(row: CurrencyRow): Currency {
  return {
    ...mapSyncableFields(row),
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    countryCode: row.countryCode ?? undefined,
    decimals: row.decimals as 0 | 2 | 3,
    isMinorUnit: toBoolean(row.isMinorUnit),
    flag: row.flag ?? undefined,
    symbolPosition: row.symbolPosition as 'before' | 'after',
    isEnabled: toBoolean(row.isEnabled),
  };
}

export function getCurrencyByCode(code: CurrencyCode): Currency | null {
  const db = getDatabase();
  const row = db.getFirstSync<CurrencyRow>(`SELECT * FROM currencies WHERE code = ?;`, [code]);
  return row ? mapRow(row) : null;
}

export function listEnabledCurrencies(): Currency[] {
  const db = getDatabase();
  const rows = db.getAllSync<CurrencyRow>(`SELECT * FROM currencies WHERE isEnabled = 1 AND deletedAt IS NULL ORDER BY code;`);
  return rows.map(mapRow);
}

export function listAllCurrencies(): Currency[] {
  const db = getDatabase();
  const rows = db.getAllSync<CurrencyRow>(`SELECT * FROM currencies WHERE deletedAt IS NULL ORDER BY code;`);
  return rows.map(mapRow);
}

export function enableCurrency(code: CurrencyCode, enabled: boolean): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE currencies SET isEnabled = ?, updatedAt = ? WHERE code = ?;`,
    [enabled ? 1 : 0, new Date().toISOString(), code],
  );
}

export function setBaseCurrency(_code: CurrencyCode): void {
  // La devise principale est dans user_settings, pas currencies.
  // Cette fonction existe pour préparer l'interface; les actual updates se font via settingsRepository.
}

/** Seed : insère toutes les devises du catalogue, active uniquement XAF par défaut. */
export function seedDefaultCurrencies(): void {
  withTransaction(() => {
    const db = getDatabase();
    for (const c of CURRENCY_CATALOG) {
      const fields = syncableCreateFields();
      const enabled = DEFAULT_CURRENCY_CODES.includes(c.code);
      db.runSync(
        `INSERT OR IGNORE INTO currencies
         (id, code, name, symbol, countryCode, decimals, isMinorUnit, flag, symbolPosition, isEnabled, createdAt, updatedAt, deletedAt, syncStatus, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          fields.id,
          c.code,
          c.name,
          c.symbol,
          c.countryCode ?? null,
          c.decimals,
          toInt(c.isMinorUnit),
          c.flag ?? null,
          c.symbolPosition,
          toInt(enabled),
          fields.createdAt,
          fields.updatedAt,
          null,
          fields.syncStatus,
          fields.version,
        ],
      );
    }
  });
}

export function assertCurrencyExists(code: CurrencyCode): void {
  const c = getCurrencyByCode(code);
  if (!c) {
    throw new MoneyZenError('INVALID_CURRENCY', `Devise inconnue : ${code}`);
  }
}
