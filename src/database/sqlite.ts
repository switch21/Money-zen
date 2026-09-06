/**
 * Money-zen — Connexion SQLite (offline-first, source de vérité principale en V1).
 *
 * Spec section 5 : "La base locale est la source principale de vérité dans la première version."
 * Spec section 33 : base versionnée, migrations, jamais modifier le schéma sans migration.
 */
import * as SQLite from 'expo-sqlite';

import { DB_NAME } from '@constants/index';
import { MoneyZenError } from '@types/index';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Ouvre (ou retourne) la connexion unique à la base SQLite.
 * À appeler au démarrage de l'app (dans AppProvider).
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (dbInstance) {
    return dbInstance;
  }
  try {
    dbInstance = SQLite.openDatabaseSync(DB_NAME, {
      enableCRSQLite: false,
      enableChangeListener: false,
    });
    // Foreign keys activées par défaut.
    dbInstance.execSync('PRAGMA foreign_keys = ON;');
    dbInstance.execSync('PRAGMA journal_mode = WAL;');
    return dbInstance;
  } catch (cause) {
    throw new MoneyZenError('DB_CONSTRAINT', 'Impossible d\'ouvrir la base SQLite.', cause);
  }
}

/**
 * Ferme la connexion (utilisé en tests).
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.closeSync();
    dbInstance = null;
  }
}

/**
 * Exécute une fonction dans une transaction.
 * En cas d'erreur, rollback automatique.
 */
export function withTransaction<T>(fn: () => T): T {
  const db = getDatabase();
  return db.withTransactionSync(() => fn());
}

/**
 * Échappe un identifiant SQLite (anti-injection sur noms de colonnes dynamiques).
 */
export function escapeIdentifier(identifier: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new MoneyZenError('DB_CONSTRAINT', `Identifiant SQLite invalide : ${identifier}`);
  }
  return `"${identifier}"`;
}
