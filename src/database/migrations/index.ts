/**
 * Money-zen — Runner de migrations (spec section 33).
 *
 * - La base SQLite doit être versionnée.
 * - Ne jamais modifier directement le schéma sans migration.
 * - Une migration = une fonction SQL idempotente (CREATE TABLE IF NOT EXISTS).
 *
 * La table `_migrations` enregistre les versions appliquées.
 */
import { getDatabase } from '../sqlite';
import { migration_0001_initial } from './0001_initial';
import { migration_0002_hybrid_storage } from './0002_hybrid_storage';
import type { MoneyZenErrorCode } from '@types/index';
import { MoneyZenError } from '@types/index';

export interface MigrationDef {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: MigrationDef[] = [
  { version: 1, name: 'initial_schema', sql: migration_0001_initial },
  { version: 2, name: 'hybrid_storage', sql: migration_0002_hybrid_storage },
];

export function runMigrations(): { fromVersion: number; toVersion: number; applied: number[] } {
  const db = getDatabase();

  // Crée la table des migrations si elle n'existe pas.
  db.execSync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      appliedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const currentRow = db.getFirstSync<{ version: number }>(`SELECT MAX(version) AS version FROM _migrations;`);
  const currentVersion = currentRow?.version ?? 0;

  const toApply = MIGRATIONS.filter((m) => m.version > currentVersion);
  if (toApply.length === 0) {
    return { fromVersion: currentVersion, toVersion: currentVersion, applied: [] };
  }

  // Applique chaque migration dans une transaction atomique.
  for (const migration of toApply) {
    try {
      db.withTransactionSync(() => {
        // Split par ';' pour exécuter chaque statement séparément.
        const statements = splitSqlStatements(migration.sql);
        for (const stmt of statements) {
          const trimmed = stmt.trim();
          if (trimmed.length === 0) continue;
          db.execSync(trimmed);
        }
        db.runSync(
          `INSERT INTO _migrations (version, name) VALUES (?, ?);`,
          [migration.version, migration.name],
        );
      });
    } catch (cause) {
      throw new MoneyZenError(
        'DB_CONSTRAINT' as MoneyZenErrorCode,
        `Migration ${migration.version} (${migration.name}) a échoué.`,
        cause,
      );
    }
  }

  return {
    fromVersion: currentVersion,
    toVersion: MIGRATIONS[MIGRATIONS.length - 1].version,
    applied: toApply.map((m) => m.version),
  };
}

/** Sépare un script SQL en statements individuels (séparateur ';'). */
function splitSqlStatements(sql: string): string[] {
  // Naïf mais suffisant pour des migrations écrites proprement (sans ';' dans des strings).
  // On ignore les ';' à l'intérieur de commentaires ou de triggers en utilisant une mini-machine.
  const out: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1] ?? '';

    if (inLineComment) {
      current += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      current += ch;
      if (ch === '*' && next === '/') {
        current += '/';
        i++;
        inBlockComment = false;
      }
      continue;
    }
    if (inSingleQuote) {
      current += ch;
      if (ch === "'") inSingleQuote = false;
      continue;
    }
    if (inDoubleQuote) {
      current += ch;
      if (ch === '"') inDoubleQuote = false;
      continue;
    }

    if (ch === '-' && next === '-') {
      inLineComment = true;
      current += ch;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      current += ch;
      continue;
    }
    if (ch === "'") {
      inSingleQuote = true;
      current += ch;
      continue;
    }
    if (ch === '"') {
      inDoubleQuote = true;
      current += ch;
      continue;
    }
    if (ch === ';') {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim().length > 0) out.push(current);
  return out;
}
