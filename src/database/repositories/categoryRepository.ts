/**
 * Money-zen — Repository : Category.
 * Spec section 14 : categories prédéfinies, archivage, jamais de suppression physique.
 */
import { getDatabase, withTransaction } from '@database/sqlite';
import { DEFAULT_CATEGORIES_SEED } from '@constants/categories';
import type { Category, CategoryType } from '@types/index';
import { mapSyncableFields, syncableCreateFields, toBoolean, toInt } from './_helpers';

type CategoryRow = Omit<Category, 'isArchived' | 'isSystem'> & { isArchived: number; isSystem: number };

function mapRow(row: CategoryRow): Category {
  return {
    ...mapSyncableFields(row),
    name: row.name,
    type: row.type as CategoryType,
    icon: row.icon,
    color: row.color,
    sortOrder: row.sortOrder,
    isArchived: toBoolean(row.isArchived),
    isSystem: toBoolean(row.isSystem),
  };
}

export function getCategoryById(id: string): Category | null {
  const db = getDatabase();
  const row = db.getFirstSync<CategoryRow>(`SELECT * FROM categories WHERE id = ? AND deletedAt IS NULL;`, [id]);
  return row ? mapRow(row) : null;
}

export function listCategoriesByType(type: CategoryType, includeArchived = false): Category[] {
  const db = getDatabase();
  const archivedClause = includeArchived ? '' : 'AND isArchived = 0';
  const rows = db.getAllSync<CategoryRow>(
    `SELECT * FROM categories WHERE type = ? AND deletedAt IS NULL ${archivedClause} ORDER BY sortOrder ASC, name ASC;`,
    [type],
  );
  return rows.map(mapRow);
}

export function listAllCategories(includeArchived = false): Category[] {
  const db = getDatabase();
  const archivedClause = includeArchived ? '' : 'WHERE isArchived = 0 AND deletedAt IS NULL';
  const rows = db.getAllSync<CategoryRow>(`SELECT * FROM categories ${archivedClause} ORDER BY sortOrder ASC, name ASC;`);
  return rows.map(mapRow);
}

export function createCategory(input: {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}): Category {
  const fields = syncableCreateFields();
  const db = getDatabase();
  const maxSortRow = db.getFirstSync<{ maxSort: number }>(
    `SELECT MAX(sortOrder) AS maxSort FROM categories WHERE type = ?;`,
    [input.type],
  );
  const sortOrder = (maxSortRow?.maxSort ?? 0) + 1;

  db.runSync(
    `INSERT INTO categories (id, name, type, icon, color, sortOrder, isArchived, isSystem, createdAt, updatedAt, deletedAt, syncStatus, version)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, NULL, ?, ?);`,
    [fields.id, input.name, input.type, input.icon, input.color, sortOrder, fields.createdAt, fields.updatedAt, fields.syncStatus, fields.version],
  );
  return getCategoryById(fields.id)!;
}

export function updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'sortOrder'>>): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const sets: string[] = [];
  const values: (string | number)[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    values.push(patch.name);
  }
  if (patch.icon !== undefined) {
    sets.push('icon = ?');
    values.push(patch.icon);
  }
  if (patch.color !== undefined) {
    sets.push('color = ?');
    values.push(patch.color);
  }
  if (patch.sortOrder !== undefined) {
    sets.push('sortOrder = ?');
    values.push(patch.sortOrder);
  }
  sets.push('updatedAt = ?');
  values.push(now);
  values.push(id);
  db.runSync(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?;`, values);
}

/**
 * Archive une catégorie utilisée par des transactions.
 * Si la catégorie est système, on ne peut QUE l'archiver.
 * Si elle n'est pas utilisée, on peut l'archiver (soft-delete).
 */
export function archiveCategory(id: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.runSync(
    `UPDATE categories SET isArchived = 1, updatedAt = ? WHERE id = ?;`,
    [now, id],
  );
}

/** Compte le nombre de transactions liées à une catégorie. */
export function countTransactionsForCategory(id: string): number {
  const db = getDatabase();
  const row = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM transactions WHERE categoryId = ? AND deletedAt IS NULL;`,
    [id],
  );
  return row?.count ?? 0;
}

/** Seed : insère toutes les catégories par défaut. */
export function seedDefaultCategories(): void {
  withTransaction(() => {
    const db = getDatabase();
    for (const c of DEFAULT_CATEGORIES_SEED) {
      const fields = syncableCreateFields();
      db.runSync(
        `INSERT OR IGNORE INTO categories
         (id, name, type, icon, color, sortOrder, isArchived, isSystem, createdAt, updatedAt, deletedAt, syncStatus, version)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, ?, ?);`,
        [
          fields.id,
          c.name,
          c.type,
          c.icon,
          c.color,
          c.sortOrder,
          toInt(c.isSystem),
          fields.createdAt,
          fields.updatedAt,
          fields.syncStatus,
          fields.version,
        ],
      );
    }
  });
}
