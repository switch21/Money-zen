/**
 * Money-zen — Constantes globales.
 */
export const APP_NAME = 'Money-zen';
export const APP_VERSION = '0.1.0';
export const DB_NAME = 'money-zen.db';
export const DB_VERSION = 1;

export const AUTO_LOCK_OPTIONS: Array<{ labelKey: string; value: number }> = [
  { labelKey: 'settings.security.autoLock.immediately', value: 0 },
  { labelKey: 'settings.security.autoLock.oneMinute', value: 60 },
  { labelKey: 'settings.security.autoLock.fiveMinutes', value: 300 },
  { labelKey: 'settings.security.autoLock.fifteenMinutes', value: 900 },
  { labelKey: 'settings.security.autoLock.never', value: -1 },
];

export const DEFAULT_BUDGET_THRESHOLDS = {
  warning: 75,
  alert: 90,
  over: 100,
};

export const EXCHANGE_RATE_STALENESS_HOURS = 24; // 24h → considéré "ancien"

export const PAGINATION_DEFAULT_PAGE_SIZE = 50;

export const TRANSACTION_SEARCH_MIN_QUERY_LENGTH = 2;

export const RECEIPT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo

export * from './currencies';
export * from './categories';
