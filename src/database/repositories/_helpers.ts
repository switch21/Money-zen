/**
 * Money-zen — Helpers de mapping SQLite ↔ entités TypeScript.
 *
 * SQLite renvoie des rows qui sont des objets plats. Nos entités ont des
 * champs typés (boolean, enum, date ISO). On a besoin de cast propre.
 */
import { uuid as generateUuid } from '@utils/uuid';

/** Convertit un entier SQLite (0/1) en boolean. */
export function toBoolean(value: unknown): boolean {
  return value === 1 || value === true;
}

/** Convertit un boolean en entier SQLite (0/1). */
export function toInt(value: boolean): number {
  return value ? 1 : 0;
}

/** Garantit qu'une valeur est une string (fallback ''). */
export function toString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/** Garantit qu'une valeur est un nombre (fallback 0). */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Garantit qu'une valeur est un entier (fallback 0). */
export function toIntSafe(value: unknown): number {
  const n = toNumber(value);
  return Math.trunc(n);
}

/** Convertit un nullable string en ISODateString | null. */
export function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value);
  return s.length > 0 ? s : null;
}

/**
 * Construit les champs de sync par défaut pour une nouvelle entité.
 */
export function syncableCreateFields() {
  const now = new Date().toISOString();
  return {
    id: generateUuid(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: 'pending' as const,
    version: 1,
  };
}

/** Mappe une row SQLite (champs syncables + deletedAt) vers un partial entity. */
export function mapSyncableFields(row: Record<string, unknown>) {
  return {
    id: toString(row.id),
    createdAt: toString(row.createdAt),
    updatedAt: toString(row.updatedAt),
    deletedAt: toNullableString(row.deletedAt),
    syncStatus: (row.syncStatus ?? 'pending') as 'pending' | 'synced' | 'failed' | 'conflict',
    version: toIntSafe(row.version) || 1,
  };
}
