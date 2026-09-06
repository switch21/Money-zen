/**
 * Money-zen — Migration 0002 : Hybrid Receipt Storage + Sync fields.
 *
 * Objectifs :
 *   - Ajouter les champs `storageMode`, `cloudUrl`, `cloudSyncedAt` à `receipts`
 *   - Ajouter les champs `userId` optionnels sur les tables synchronisables (pour sync Supabase)
 *   - Préparer les index pour la sync queue
 */

export const migration_0002_hybrid_storage = `
-- ─── receipts : champs hybride (local + cloud) ────────────────────────────
ALTER TABLE receipts ADD COLUMN storageMode TEXT NOT NULL DEFAULT 'local'
  CHECK (storageMode IN ('local', 'cloud', 'hybrid'));
ALTER TABLE receipts ADD COLUMN cloudUrl TEXT;
ALTER TABLE receipts ADD COLUMN cloudSyncedAt TEXT;
ALTER TABLE receipts ADD COLUMN cloudBucketPath TEXT;
CREATE INDEX IF NOT EXISTS idx_receipts_storage_mode ON receipts (storageMode);
CREATE INDEX IF NOT EXISTS idx_receipts_cloud_synced ON receipts (cloudSyncedAt);

-- ─── sync_queue : id utilisateur (pour multi-tenant Supabase) ────────────
ALTER TABLE sync_queue ADD COLUMN userId TEXT;
CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON sync_queue (userId, queuedAt);

-- ─── users_profiles (table locale miroir de profiles Supabase) ────────────
CREATE TABLE IF NOT EXISTS users_profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  displayName TEXT,
  avatarUrl TEXT,
  isCloudUser INTEGER NOT NULL DEFAULT 0,
  lastLoginAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Champ syncAccountId sur tables synchronisables (toutes ont déjà userId implicite via session) ──
-- Pour la V2 cloud sync, on ajoute explicitement un cloudId (UUID côté Supabase) distinct du local id.
ALTER TABLE accounts ADD COLUMN cloudId TEXT;
ALTER TABLE categories ADD COLUMN cloudId TEXT;
ALTER TABLE transactions ADD COLUMN cloudId TEXT;
ALTER TABLE budgets ADD COLUMN cloudId TEXT;
ALTER TABLE goals ADD COLUMN cloudId TEXT;
ALTER TABLE recurring_transactions ADD COLUMN cloudId TEXT;
ALTER TABLE exchange_rates ADD COLUMN cloudId TEXT;

CREATE INDEX IF NOT EXISTS idx_accounts_cloud_id ON accounts (cloudId);
CREATE INDEX IF NOT EXISTS idx_transactions_cloud_id ON transactions (cloudId);
CREATE INDEX IF NOT EXISTS idx_budgets_cloud_id ON budgets (cloudId);
CREATE INDEX IF NOT EXISTS idx_goals_cloud_id ON goals (cloudId);
CREATE INDEX IF NOT EXISTS idx_recurring_cloud_id ON recurring_transactions (cloudId);

-- ─── OCR usage tracking (limite utilisateur mensuelle, anti-abus) ────────
CREATE TABLE IF NOT EXISTS ocr_usage (
  id TEXT PRIMARY KEY,
  userId TEXT,
  keyIndex INTEGER NOT NULL,        -- index de la clé OCR.space utilisée (0-3)
  usedAt TEXT NOT NULL DEFAULT (datetime('now')),
  monthBucket TEXT NOT NULL,        -- 'YYYY-MM' pour reset mensuel
  success INTEGER NOT NULL DEFAULT 1,
  errorCode TEXT,
  fileSizeBytes INTEGER,
  receiptId TEXT,
  FOREIGN KEY (receiptId) REFERENCES receipts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ocr_usage_user_month ON ocr_usage (userId, monthBucket);
CREATE INDEX IF NOT EXISTS idx_ocr_usage_key ON ocr_usage (keyIndex, monthBucket);
`;
