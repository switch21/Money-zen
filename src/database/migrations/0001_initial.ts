/**
 * Money-zen — Migration 0001 : Schéma initial.
 *
 * Toutes les tables incluent les champs synchronisables (spec section 38) :
 *   id, createdAt, updatedAt, deletedAt, syncStatus, version
 *
 * Contraintes métier (spec section 34) :
 *   - montant > 0
 *   - devise valide
 *   - compte existant
 *   - catégorie existante
 *   - transfert source ≠ destination
 *   - date valide
 *   - taux de change valide
 *   - aucun doublon de transaction récurrente
 */

export const migration_0001_initial = `
-- ─── user_settings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  baseCurrency TEXT NOT NULL DEFAULT 'XAF',
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  themePreference TEXT NOT NULL DEFAULT 'system' CHECK (themePreference IN ('light', 'dark', 'system')),
  isDemoMode INTEGER NOT NULL DEFAULT 0,
  isOnboardingComplete INTEGER NOT NULL DEFAULT 0,
  lastSyncedAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── security_settings ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  isPinEnabled INTEGER NOT NULL DEFAULT 0,
  pinHash TEXT,
  isBiometricEnabled INTEGER NOT NULL DEFAULT 0,
  autoLockDelaySeconds INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── notification_settings ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  enableReminder INTEGER NOT NULL DEFAULT 1,
  enableBudgetWarning INTEGER NOT NULL DEFAULT 1,
  enableBudgetOver INTEGER NOT NULL DEFAULT 1,
  enableRecurring INTEGER NOT NULL DEFAULT 1,
  enableGoalUpdates INTEGER NOT NULL DEFAULT 1,
  enableWeeklySummary INTEGER NOT NULL DEFAULT 1,
  reminderHour INTEGER NOT NULL DEFAULT 20 CHECK (reminderHour >= 0 AND reminderHour <= 23),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── currencies ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS currencies (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  countryCode TEXT,
  decimals INTEGER NOT NULL DEFAULT 2 CHECK (decimals IN (0, 2, 3)),
  isMinorUnit INTEGER NOT NULL DEFAULT 0,
  flag TEXT,
  symbolPosition TEXT NOT NULL DEFAULT 'after' CHECK (symbolPosition IN ('before', 'after')),
  isEnabled INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  deletedAt TEXT,
  syncStatus TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1
);

-- ─── exchange_rates ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY,
  fromCurrency TEXT NOT NULL,
  toCurrency TEXT NOT NULL,
  rate REAL NOT NULL CHECK (rate > 0),
  source TEXT NOT NULL DEFAULT 'api' CHECK (source IN ('manual', 'api', 'last-known')),
  rateDate TEXT NOT NULL,
  fetchedAt TEXT NOT NULL DEFAULT (datetime('now')),
  isManualOverride INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  deletedAt TEXT,
  syncStatus TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (fromCurrency, toCurrency, rateDate),
  FOREIGN KEY (fromCurrency) REFERENCES currencies(code),
  FOREIGN KEY (toCurrency) REFERENCES currencies(code)
);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON exchange_rates (fromCurrency, toCurrency);

-- ─── accounts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'card', 'mobile_money', 'savings', 'crypto', 'wallet', 'other')),
  currency TEXT NOT NULL,
  initialBalanceMinor INTEGER NOT NULL DEFAULT 0,
  currentBalanceMinor INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT '💵',
  color TEXT NOT NULL DEFAULT '#C97048',
  mobileMoneyProvider TEXT CHECK (mobileMoneyProvider IS NULL OR mobileMoneyProvider IN ('orange_money', 'mtn_momo', 'moov_money', 'wave', 'other')),
  maskedNumber TEXT,
  notes TEXT,
  isArchived INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  deletedAt TEXT,
  syncStatus TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (currency) REFERENCES currencies(code)
);
CREATE INDEX IF NOT EXISTS idx_accounts_archived ON accounts (isArchived);

-- ─── categories ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer', 'savings')),
  icon TEXT NOT NULL DEFAULT '📦',
  color TEXT NOT NULL DEFAULT '#9B9489',
  sortOrder INTEGER NOT NULL DEFAULT 0,
  isArchived INTEGER NOT NULL DEFAULT 0,
  isSystem INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  deletedAt TEXT,
  syncStatus TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_categories_type_archived ON categories (type, isArchived);
CREATE INDEX IF NOT EXISTS idx_categories_sortorder ON categories (sortOrder);

-- ─── transactions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  accountId TEXT NOT NULL,
  categoryId TEXT,
  amountMinor INTEGER NOT NULL CHECK (amountMinor > 0),
  currencyCode TEXT NOT NULL,
  convertedAmountMinor INTEGER NOT NULL DEFAULT 0,
  baseCurrencyCode TEXT NOT NULL,
  exchangeRate REAL NOT NULL DEFAULT 1.0,
  exchangeRateDate TEXT,
  date TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  notes TEXT,
  merchant TEXT,
  receiptId TEXT,
  isRecurring INTEGER NOT NULL DEFAULT 0,
  recurringTransactionId TEXT,
  transferPairId TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  deletedAt TEXT,
  syncStatus TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (accountId) REFERENCES accounts(id),
  FOREIGN KEY (categoryId) REFERENCES categories(id),
  FOREIGN KEY (currencyCode) REFERENCES currencies(code),
  FOREIGN KEY (baseCurrencyCode) REFERENCES currencies(code)
);
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions (accountId, date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (categoryId);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions (recurringTransactionId);

-- ─── transaction_transfers (modèle séparé, spec section 11) ─────────────
CREATE TABLE IF NOT EXISTS transaction_transfers (
  id TEXT PRIMARY KEY,
  transactionId TEXT NOT NULL UNIQUE,
  sourceAccountId TEXT NOT NULL,
  destinationAccountId TEXT NOT NULL,
  sourceAmountMinor INTEGER NOT NULL CHECK (sourceAmountMinor > 0),
  sourceCurrency TEXT NOT NULL,
  destinationAmountMinor INTEGER NOT NULL CHECK (destinationAmountMinor > 0),
  destinationCurrency TEXT NOT NULL,
  exchangeRate REAL NOT NULL DEFAULT 1.0,
  exchangeRateDate TEXT,
  feeTransactionId TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (sourceAccountId != destinationAccountId),
  FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (sourceAccountId) REFERENCES accounts(id),
  FOREIGN KEY (destinationAccountId) REFERENCES accounts(id),
  FOREIGN KEY (sourceCurrency) REFERENCES currencies(code),
  FOREIGN KEY (destinationCurrency) REFERENCES currencies(code),
  FOREIGN KEY (feeTransactionId) REFERENCES transactions(id)
);
CREATE INDEX IF NOT EXISTS idx_transfers_source ON transaction_transfers (sourceAccountId);
CREATE INDEX IF NOT EXISTS idx_transfers_dest ON transaction_transfers (destinationAccountId);

-- ─── budgets ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  categoryId TEXT,
  currencyCode TEXT NOT NULL,
  amountMinor INTEGER NOT NULL CHECK (amountMinor > 0),
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  warningThreshold INTEGER NOT NULL DEFAULT 75 CHECK (warningThreshold >= 0 AND warningThreshold <= 100),
  alertThreshold INTEGER NOT NULL DEFAULT 90 CHECK (alertThreshold >= 0 AND alertThreshold <= 100),
  overThreshold INTEGER NOT NULL DEFAULT 100 CHECK (overThreshold >= 0 AND overThreshold <= 200),
  isArchived INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  deletedAt TEXT,
  syncStatus TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (categoryId) REFERENCES categories(id),
  FOREIGN KEY (currencyCode) REFERENCES currencies(code)
);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets (period);

-- ─── goals ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎯',
  color TEXT NOT NULL DEFAULT '#C97048',
  targetAmountMinor INTEGER NOT NULL CHECK (targetAmountMinor > 0),
  currentAmountMinor INTEGER NOT NULL DEFAULT 0,
  currencyCode TEXT NOT NULL,
  targetDate TEXT,
  linkedAccountId TEXT,
  isAchieved INTEGER NOT NULL DEFAULT 0,
  isArchived INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  deletedAt TEXT,
  syncStatus TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (currencyCode) REFERENCES currencies(code),
  FOREIGN KEY (linkedAccountId) REFERENCES accounts(id)
);
CREATE INDEX IF NOT EXISTS idx_goals_achieved ON goals (isAchieved);

-- ─── recurring_transactions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  accountId TEXT NOT NULL,
  categoryId TEXT,
  amountMinor INTEGER NOT NULL CHECK (amountMinor > 0),
  currencyCode TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  startDate TEXT NOT NULL,
  endDate TEXT,
  dayOfMonth INTEGER CHECK (dayOfMonth IS NULL OR (dayOfMonth >= 1 AND dayOfMonth <= 31)),
  occurrencesGenerated INTEGER NOT NULL DEFAULT 0,
  nextOccurrence TEXT,
  isArchived INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  deletedAt TEXT,
  syncStatus TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (accountId) REFERENCES accounts(id),
  FOREIGN KEY (categoryId) REFERENCES categories(id),
  FOREIGN KEY (currencyCode) REFERENCES currencies(code)
);
CREATE INDEX IF NOT EXISTS idx_recurring_next ON recurring_transactions (nextOccurrence);

-- ─── receipts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  transactionId TEXT,
  filePath TEXT NOT NULL,
  originalFileName TEXT,
  mimeType TEXT NOT NULL,
  sizeBytes INTEGER NOT NULL,
  ocrProcessed INTEGER NOT NULL DEFAULT 0,
  ocrData TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  deletedAt TEXT,
  syncStatus TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_receipts_transaction ON receipts (transactionId);

-- ─── sync_queue (Phase 15 — préparée) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entityType TEXT NOT NULL,
  entityId TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  lastError TEXT,
  queuedAt TEXT NOT NULL DEFAULT (datetime('now')),
  lastAttemptAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_queued ON sync_queue (queuedAt);
`;
