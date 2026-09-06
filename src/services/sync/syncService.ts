/**
 * Money-zen — SyncService (Phase 15 — Cloud sync avec Supabase).
 *
 * Architecture :
 *   Local SQLite → Sync Queue → Supabase → Conflict Resolution → SQLite
 *
 * Stratégie :
 *   1. Push : lit sync_queue, POST chaque row à Supabase, marque syncStatus='synced'
 *   2. Pull : GET delta (updated_at > last_synced_at) depuis Supabase, upsert local
 *   3. Conflits : last-writer-wins par défaut, marque 'conflict' pour relecture manuelle
 *
 * Spec section 38 :
 *   - Chaque entité a : id, createdAt, updatedAt, deletedAt, syncStatus, version
 *   - États : pending | synced | failed | conflict
 *   - Ne jamais écraser silencieusement en cas de conflit.
 */
import type { User } from '@supabase/supabase-js';

import { getDatabase, withTransaction } from '@database/sqlite';
import { isSupabaseEnabled, getSupabase, getSupabaseOrNull, getSyncStrategy } from './supabaseClient';
import { AuthService } from './authService';
import { updateLastSyncedAt } from '@database/repositories/settingsRepository';
import type { SyncStatus } from '@types/index';

const SYNCABLE_TABLES = [
  'accounts',
  'categories',
  'transactions',
  'transaction_transfers',
  'budgets',
  'goals',
  'recurring_transactions',
  'receipts',
  'exchange_rates',
] as const;

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  failed: number;
  durationMs: number;
}

export const SyncService = {
  /** True si le sync cloud est activé (config + strategy != disabled). */
  isCloudEnabled(): boolean {
    if (!isSupabaseEnabled()) return false;
    return getSyncStrategy() !== 'disabled';
  },

  /** Récupère le user courant (null si pas connecté). */
  async getCurrentUser(): Promise<User | null> {
    return AuthService.getCurrentUser();
  },

  /** Compte les items en attente de sync. */
  getPendingCount(): number {
    const db = getDatabase();
    const row = db.getFirstSync<{ count: number }>(`SELECT COUNT(*) AS count FROM sync_queue;`);
    return row?.count ?? 0;
  },

  /**
   * Pousse les changements locaux vers Supabase.
   * Spécifiquement : lit sync_queue, fait upsert sur la table distante, marque syncStatus='synced'.
   */
  async pushPendingChanges(): Promise<{ pushed: number; failed: number }> {
    if (!this.isCloudEnabled()) return { pushed: 0, failed: 0 };

    const user = await this.getCurrentUser();
    if (!user) return { pushed: 0, failed: 0 };

    const supabase = getSupabase();
    const db = getDatabase();
    let pushed = 0;
    let failed = 0;

    const pendingRows = db.getAllSync<{
      id: string;
      entityType: string;
      entityId: string;
      operation: string;
      attempts: number;
    }>(`SELECT * FROM sync_queue ORDER BY queuedAt ASC LIMIT 50;`);

    for (const item of pendingRows) {
      try {
        const table = SYNCABLE_TABLES.find((t) => t === item.entityType);
        if (!table) {
          // Type inconnu, on drop la row.
          db.runSync(`DELETE FROM sync_queue WHERE id = ?;`, [item.id]);
          continue;
        }

        // Lit l'entité locale.
        const localRow = db.getFirstSync<Record<string, unknown>>(
          `SELECT * FROM ${table} WHERE id = ?;`,
          [item.entityId],
        );

        if (item.operation === 'delete' || !localRow) {
          // Delete distant
          await supabase.from(table).delete().eq('id', item.entityId);
        } else {
          // Upsert
          const payload = { ...localRow, user_id: user.id };
          const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
          if (error) throw error;
        }

        // Marque comme synced localement
        db.runSync(
          `UPDATE ${item.entityType} SET syncStatus = 'synced', updatedAt = ? WHERE id = ?;`,
          [new Date().toISOString(), item.entityId],
        );
        db.runSync(`DELETE FROM sync_queue WHERE id = ?;`, [item.id]);
        pushed++;
      } catch (e) {
        console.warn(`[SyncService] push failed for ${item.entityType}/${item.entityId}`, e);
        db.runSync(
          `UPDATE sync_queue SET attempts = attempts + 1, lastError = ?, lastAttemptAt = ? WHERE id = ?;`,
          [(e as Error)?.message ?? 'unknown', new Date().toISOString(), item.id],
        );
        failed++;
      }
    }

    return { pushed, failed };
  },

  /**
   * Tire les changements distants depuis Supabase.
   * Utilise un timestamp de dernière sync pour ne récupérer que les deltas.
   */
  async pullRemoteChanges(): Promise<{ pulled: number; conflicts: number }> {
    if (!this.isCloudEnabled()) return { pulled: 0, conflicts: 0 };

    const user = await this.getCurrentUser();
    if (!user) return { pulled: 0, conflicts: 0 };

    const supabase = getSupabase();
    const db = getDatabase();
    let pulled = 0;
    let conflicts = 0;

    // Lit le lastSyncedAt local.
    const settingsRow = db.getFirstSync<{ lastSyncedAt: string | null }>(
      `SELECT lastSyncedAt FROM user_settings WHERE id = 'singleton';`,
    );
    const lastSyncedAt = settingsRow?.lastSyncedAt ?? new Date(0).toISOString();

    for (const table of SYNCABLE_TABLES) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', user.id)
          .gt('updated_at', lastSyncedAt)
          .order('updated_at', { ascending: true })
          .limit(100);

        if (error) {
          console.warn(`[SyncService] pull ${table} failed`, error.message);
          continue;
        }
        if (!data || data.length === 0) continue;

        withTransaction(() => {
          for (const remoteRow of data) {
            const remoteId = String(remoteRow.id);
            const localRow = db.getFirstSync<Record<string, unknown>>(
              `SELECT * FROM ${table} WHERE id = ? OR cloudId = ?;`,
              [remoteId, remoteId],
            );

            if (localRow) {
              // Conflit potentiel : compare versions
              const localVersion = Number(localRow.version ?? 1);
              const remoteVersion = Number(remoteRow.version ?? 1);
              const localUpdatedAt = String(localRow.updatedAt ?? '');
              const remoteUpdatedAt = String(remoteRow.updated_at ?? remoteRow.updatedAt ?? '');

              if (localUpdatedAt === remoteUpdatedAt) {
                // Pas de conflit, juste update les champs
                this.upsertLocal(table, remoteRow);
                pulled++;
              } else if (remoteVersion > localVersion) {
                // Remote plus récent, accepte
                this.upsertLocal(table, remoteRow);
                pulled++;
              } else if (localVersion > remoteVersion) {
                // Local plus récent, on garde local et push plus tard
                db.runSync(
                  `UPDATE ${table} SET syncStatus = 'pending' WHERE id = ?;`,
                  [remoteId],
                );
                conflicts++;
              } else {
                // Même version mais updatedAt différents → conflict
                db.runSync(
                  `UPDATE ${table} SET syncStatus = 'conflict' WHERE id = ?;`,
                  [String(localRow.id)],
                );
                conflicts++;
              }
            } else {
              // Pas de row locale, insère
              this.upsertLocal(table, remoteRow);
              pulled++;
            }
          }
        });
      } catch (e) {
        console.warn(`[SyncService] pull ${table} failed`, e);
      }
    }

    return { pulled, conflicts };
  },

  /**
   * Insère ou met à jour une row distante localement.
   * Mappe les champs snake_case de Supabase vers notre schéma local.
   */
  upsertLocal(table: string, remoteRow: Record<string, unknown>): void {
    const db = getDatabase();
    const id = String(remoteRow.id);
    const existing = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${table} WHERE id = ? OR cloudId = ?;`,
      [id, id],
    );

    const now = new Date().toISOString();
    if (existing && existing.count > 0) {
      // Update — on garde le id local, on update cloudId + autres champs
      const fields = Object.entries(remoteRow)
        .filter(([k]) => !['id', 'created_at'].includes(k))
        .map(([k]) => `${k === 'updated_at' ? 'updatedAt' : k === 'deleted_at' ? 'deletedAt' : k} = ?`)
        .join(', ');
      const values = Object.entries(remoteRow)
        .filter(([k]) => !['id', 'created_at'].includes(k))
        .map(([, v]) => v);
      values.push(now, id);
      db.runSync(
        `UPDATE ${table} SET ${fields}, updatedAt = ? WHERE id = ? OR cloudId = ?;`,
        [...values, id],
      );
    } else {
      // Insert
      const cols = Object.keys(remoteRow)
        .filter((k) => k !== 'created_at')
        .map((k) => (k === 'updated_at' ? 'updatedAt' : k === 'deleted_at' ? 'deletedAt' : k));
      const placeholders = cols.map(() => '?').join(', ');
      const values = cols.map((k) => remoteRow[k]);
      db.runSync(
        `INSERT OR IGNORE INTO ${table} (${cols.join(',')}, createdAt) VALUES (${placeholders}, ?);`,
        [...values, now],
      );
    }
  },

  /**
   * Marque une entité comme needing sync (à appeler après chaque mutation locale).
   */
  enqueueSync(entityType: string, entityId: string, operation: 'create' | 'update' | 'delete'): void {
    const db = getDatabase();
    const id = syncableCreateId();
    db.runSync(
      `INSERT INTO sync_queue (id, entityType, entityId, operation) VALUES (?, ?, ?, ?);`,
      [id, entityType, entityId, operation],
    );
    // Marque l'entité en pending.
    db.runSync(`UPDATE ${entityType} SET syncStatus = 'pending' WHERE id = ?;`, [entityId]);
  },

  /** Lance sync complète : push puis pull puis update lastSyncedAt. */
  async syncNow(): Promise<SyncResult> {
    const start = Date.now();
    if (!this.isCloudEnabled()) {
      return { pushed: 0, pulled: 0, conflicts: 0, failed: 0, durationMs: 0 };
    }
    const pushRes = await this.pushPendingChanges();
    const pullRes = await this.pullRemoteChanges();
    this.markSynced();
    return {
      pushed: pushRes.pushed,
      pulled: pullRes.pulled,
      conflicts: pullRes.conflicts,
      failed: pushRes.failed,
      durationMs: Date.now() - start,
    };
  },

  /** Marque la dernière synchro complète. */
  markSynced(): void {
    updateLastSyncedAt(new Date().toISOString());
  },

  /**
   * Résout un conflit manuellement (l'utilisateur choisit local ou remote).
   */
  resolveConflictManually(entityType: string, entityId: string, choice: 'local' | 'remote'): SyncStatus {
    if (choice === 'local') {
      // Force push local
      this.enqueueSync(entityType, entityId, 'update');
      return 'pending';
    } else {
      // Accept remote (le pull suivant écrasera local)
      const db = getDatabase();
      db.runSync(
        `UPDATE ${entityType} SET syncStatus = 'synced' WHERE id = ?;`,
        [entityId],
      );
      return 'synced';
    }
  },
};

function syncableCreateId(): string {
  // Petite fonction locale pour générer un id (sans import circulaire).
  const random = Math.random.toString(36).slice(2);
  return `${random()}-${Date.now().toString(36)}`;
}
