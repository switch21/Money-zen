/**
 * Money-zen — Repository : Goal (objectifs d'épargne).
 * Spec section 25 : progression, montant restant, épargne mensuelle nécessaire.
 */
import { getDatabase } from '@database/sqlite';
import type { CurrencyCode, Goal, GoalStatus, ISODateString, MoneyMinor } from '@types/index';
import { monthsUntilNow } from '@utils/date';
import { mapSyncableFields, syncableCreateFields, toBoolean, toNumber, toString } from './_helpers';

type GoalRow = Omit<Goal, 'isArchived' | 'isAchieved'> & { isArchived: number; isAchieved: number };

function mapRow(row: GoalRow): Goal {
  return {
    ...mapSyncableFields(row),
    name: row.name,
    icon: row.icon,
    color: row.color,
    targetAmountMinor: toNumber(row.targetAmountMinor),
    currentAmountMinor: toNumber(row.currentAmountMinor),
    currencyCode: row.currencyCode as CurrencyCode,
    targetDate: row.targetDate ?? null,
    linkedAccountId: row.linkedAccountId ?? null,
    isAchieved: toBoolean(row.isAchieved),
    isArchived: toBoolean(row.isArchived),
  };
}

export function getGoalById(id: string): Goal | null {
  const db = getDatabase();
  const row = db.getFirstSync<GoalRow>(`SELECT * FROM goals WHERE id = ? AND deletedAt IS NULL;`, [id]);
  return row ? mapRow(row) : null;
}

export function listGoals(includeArchived = false): Goal[] {
  const db = getDatabase();
  const clause = includeArchived ? '' : 'AND isArchived = 0';
  const rows = db.getAllSync<GoalRow>(`SELECT * FROM goals WHERE deletedAt IS NULL ${clause} ORDER BY createdAt;`);
  return rows.map(mapRow);
}

interface CreateGoalInput {
  name: string;
  icon?: string;
  color?: string;
  targetAmountMinor: MoneyMinor;
  currentAmountMinor?: MoneyMinor;
  currencyCode: CurrencyCode;
  targetDate?: ISODateString | null;
  linkedAccountId?: string | null;
}

export function createGoal(input: CreateGoalInput): Goal {
  const fields = syncableCreateFields();
  const db = getDatabase();
  db.runSync(
    `INSERT INTO goals
     (id, name, icon, color, targetAmountMinor, currentAmountMinor, currencyCode,
      targetDate, linkedAccountId, isAchieved, isArchived,
      createdAt, updatedAt, deletedAt, syncStatus, version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, NULL, ?, ?);`,
    [
      fields.id,
      input.name,
      input.icon ?? '🎯',
      input.color ?? '#C97048',
      input.targetAmountMinor,
      input.currentAmountMinor ?? 0,
      input.currencyCode,
      input.targetDate ?? null,
      input.linkedAccountId ?? null,
      fields.createdAt,
      fields.updatedAt,
      fields.syncStatus,
      fields.version,
    ],
  );
  return getGoalById(fields.id)!;
}

export function updateGoal(id: string, patch: Partial<Goal>): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined && k !== 'id') {
      sets.push(`${k} = ?`);
      values.push(v as string | number | null);
    }
  }
  sets.push('updatedAt = ?');
  values.push(now);
  values.push(id);
  db.runSync(`UPDATE goals SET ${sets.join(', ')} WHERE id = ?;`, values);
}

export function archiveGoal(id: string): void {
  const db = getDatabase();
  db.runSync(`UPDATE goals SET isArchived = 1, updatedAt = ? WHERE id = ?;`, [
    new Date().toISOString(),
    id,
  ]);
}

/** Marque un objectif comme atteint et notifie. */
export function markGoalAchieved(id: string): void {
  const db = getDatabase();
  db.runSync(`UPDATE goals SET isAchieved = 1, updatedAt = ? WHERE id = ?;`, [
    new Date().toISOString(),
    id,
  ]);
}

/** Calcule la progression et l'épargne mensuelle nécessaire. */
export function getGoalStatus(goal: Goal): GoalStatus {
  const progressPercent = goal.targetAmountMinor > 0
    ? (goal.currentAmountMinor / goal.targetAmountMinor) * 100
    : 0;
  const remainingMinor = Math.max(0, goal.targetAmountMinor - goal.currentAmountMinor);
  const monthsRemaining = goal.targetDate ? monthsUntilNow(goal.targetDate) : 0;
  const monthlySavingsNeeded = monthsRemaining > 0
    ? Math.ceil(remainingMinor / monthsRemaining)
    : remainingMinor;
  return {
    goal,
    progressPercent,
    remainingMinor,
    monthlySavingsNeeded,
    monthsRemaining,
  };
}
