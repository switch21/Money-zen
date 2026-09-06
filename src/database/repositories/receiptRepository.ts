/**
 * Money-zen — Repository : Receipt.
 * Spec section 29 : photo, galerie, stockage, rattachement transaction.
 * Migration 0002 : support du mode hybride (local + Supabase Storage).
 */
import { getDatabase } from '@database/sqlite';
import type { Receipt, ReceiptStorageMode } from '@types/index';
import { mapSyncableFields, syncableCreateFields, toBoolean, toNumber, toString, toNullableString } from './_helpers';

type ReceiptRow = Omit<Receipt, 'ocrProcessed' | 'storageMode'> & {
  ocrProcessed: number;
  storageMode: string;
};

function mapRow(row: ReceiptRow): Receipt {
  return {
    ...mapSyncableFields(row),
    transactionId: row.transactionId ?? null,
    filePath: toString(row.filePath),
    cloudUrl: toNullableString(row.cloudUrl),
    cloudBucketPath: toNullableString(row.cloudBucketPath),
    cloudSyncedAt: toNullableString(row.cloudSyncedAt),
    storageMode: (row.storageMode ?? 'local') as ReceiptStorageMode,
    originalFileName: row.originalFileName ?? undefined,
    mimeType: toString(row.mimeType),
    sizeBytes: toNumber(row.sizeBytes),
    ocrProcessed: toBoolean(row.ocrProcessed),
    ocrData: row.ocrData ?? undefined,
  };
}

export function getReceiptById(id: string): Receipt | null {
  const db = getDatabase();
  const row = db.getFirstSync<ReceiptRow>(`SELECT * FROM receipts WHERE id = ? AND deletedAt IS NULL;`, [id]);
  return row ? mapRow(row) : null;
}

export function getReceiptForTransaction(transactionId: string): Receipt | null {
  const db = getDatabase();
  const row = db.getFirstSync<ReceiptRow>(
    `SELECT * FROM receipts WHERE transactionId = ? AND deletedAt IS NULL LIMIT 1;`,
    [transactionId],
  );
  return row ? mapRow(row) : null;
}

/** Liste tous les reçus non synchronisés (mode hybride/cloud). */
export function listUnsyncedReceipts(): Receipt[] {
  const db = getDatabase();
  const rows = db.getAllSync<ReceiptRow>(
    `SELECT * FROM receipts WHERE deletedAt IS NULL
       AND storageMode IN ('cloud', 'hybrid')
       AND cloudSyncedAt IS NULL
     ORDER BY createdAt ASC;`,
  );
  return rows.map(mapRow);
}

interface CreateReceiptInput {
  transactionId?: string | null;
  filePath: string;
  originalFileName?: string;
  mimeType: string;
  sizeBytes: number;
  storageMode?: ReceiptStorageMode;
}

export function createReceipt(input: CreateReceiptInput): Receipt {
  const fields = syncableCreateFields();
  const db = getDatabase();
  db.runSync(
    `INSERT INTO receipts
     (id, transactionId, filePath, storageMode, originalFileName, mimeType, sizeBytes,
      ocrProcessed, cloudUrl, cloudBucketPath, cloudSyncedAt,
      createdAt, updatedAt, deletedAt, syncStatus, version)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, NULL, ?, ?, NULL, ?, ?);`,
    [
      fields.id,
      input.transactionId ?? null,
      input.filePath,
      input.storageMode ?? 'local',
      input.originalFileName ?? null,
      input.mimeType,
      input.sizeBytes,
      fields.createdAt,
      fields.updatedAt,
      fields.syncStatus,
      fields.version,
    ],
  );
  return getReceiptById(fields.id)!;
}

export function attachToTransaction(receiptId: string, transactionId: string): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE receipts SET transactionId = ?, updatedAt = ? WHERE id = ?;`,
    [transactionId, new Date().toISOString(), receiptId],
  );
}

export function markOcrProcessed(receiptId: string, ocrData: string): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE receipts SET ocrProcessed = 1, ocrData = ?, updatedAt = ? WHERE id = ?;`,
    [ocrData, new Date().toISOString(), receiptId],
  );
}

/** Met à jour les champs cloud après upload Supabase Storage. */
export function markCloudSynced(
  receiptId: string,
  cloudUrl: string,
  cloudBucketPath: string,
): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE receipts
       SET cloudUrl = ?, cloudBucketPath = ?, cloudSyncedAt = ?,
           storageMode = CASE WHEN storageMode = 'local' THEN 'hybrid' ELSE storageMode END,
           updatedAt = ?
     WHERE id = ?;`,
    [cloudUrl, cloudBucketPath, new Date().toISOString(), new Date().toISOString(), receiptId],
  );
}

/** Change explicitement le mode de stockage (depuis Settings UI). */
export function setStorageMode(receiptId: string, mode: ReceiptStorageMode): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE receipts SET storageMode = ?, updatedAt = ? WHERE id = ?;`,
    [mode, new Date().toISOString(), receiptId],
  );
}

/** Bascule tous les reçus d'un user vers un nouveau mode (utilisé quand l'user active/désactive le cloud). */
export function bulkSetStorageMode(newMode: ReceiptStorageMode): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE receipts SET storageMode = ?, updatedAt = ? WHERE deletedAt IS NULL;`,
    [newMode, new Date().toISOString()],
  );
}

export function softDeleteReceipt(id: string): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE receipts SET deletedAt = ?, updatedAt = ? WHERE id = ?;`,
    [new Date().toISOString(), new Date().toISOString(), id],
  );
}

/** Supprime le fichier local d'un reçu (mais conserve la row si cloud). */
export function clearLocalFile(receiptId: string): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE receipts SET filePath = '', updatedAt = ? WHERE id = ?;`,
    [new Date().toISOString(), receiptId],
  );
}

// ─── OCR usage tracking (migration 0002) ────────────────────────────────────
export interface OcrUsageRow {
  id: string;
  userId: string | null;
  keyIndex: number;
  usedAt: string;
  monthBucket: string;
  success: boolean;
  errorCode: string | null;
  fileSizeBytes: number | null;
  receiptId: string | null;
}

export function recordOcrUsage(input: Omit<OcrUsageRow, 'id' | 'usedAt' | 'monthBucket'>): void {
  const db = getDatabase();
  const id = syncableCreateFields().id;
  const monthBucket = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  db.runSync(
    `INSERT INTO ocr_usage (id, userId, keyIndex, usedAt, monthBucket, success, errorCode, fileSizeBytes, receiptId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      input.userId,
      input.keyIndex,
      new Date().toISOString(),
      monthBucket,
      input.success ? 1 : 0,
      input.errorCode,
      input.fileSizeBytes,
      input.receiptId,
    ],
  );
}

export function getOcrUsageForUserThisMonth(userId: string | null): number {
  const db = getDatabase();
  const monthBucket = new Date().toISOString().slice(0, 7);
  const row = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM ocr_usage
     WHERE monthBucket = ? AND success = 1 AND (userId = ? OR (? IS NULL AND userId IS NULL));`,
    [monthBucket, userId, userId],
  );
  return row?.count ?? 0;
}

export function getOcrUsageByKeyThisMonth(): Array<{ keyIndex: number; count: number; successCount: number }> {
  const db = getDatabase();
  const monthBucket = new Date().toISOString().slice(0, 7);
  const rows = db.getAllSync<{ keyIndex: number; count: number; successCount: number }>(
    `SELECT keyIndex,
            COUNT(*) AS count,
            SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS successCount
     FROM ocr_usage
     WHERE monthBucket = ?
     GROUP BY keyIndex
     ORDER BY keyIndex;`,
    [monthBucket],
  );
  return rows ?? [];
}
