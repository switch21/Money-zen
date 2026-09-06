/**
 * Money-zen — Helpers UUID v4 (sans dépendance externe).
 * Utilisé pour toutes les clés primaires (sync-friendly).
 */
import * as Crypto from 'expo-crypto';

export function uuid(): string {
  // expo-crypto propose un générateur random natif.
  const bytes = Crypto.randomBytes(16) as Uint8Array;
  // RFC 4122 v4
  bytes[6] = (bytes[6] ?? 0) & 0x0f; // eslint-disable-line no-bitwise
  bytes[6] = (bytes[6] ?? 0) | 0x40; // eslint-disable-line no-bitwise
  bytes[8] = (bytes[8] ?? 0) & 0x3f; // eslint-disable-line no-bitwise
  bytes[8] = (bytes[8] ?? 0) | 0x80; // eslint-disable-line no-bitwise
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
