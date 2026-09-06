/**
 * Money-zen — Supabase Client (singleton).
 *
 * Charge la config depuis les variables d'environnement EXPO_PUBLIC_*.
 * Détecte automatiquement si Supabase est activé (URL + ANON_KEY renseignés).
 *
 * Spec section 37 : préparer l'architecture pour Supabase.
 * Spec section 38 : chaque entité synchronisable a syncStatus, version, updatedAt, deletedAt.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let client: SupabaseClient | null = null;
let isEnabled = false;

try {
  isEnabled = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
} catch {
  isEnabled = false;
}

if (isEnabled && !client) {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: {
          getItem: (key: string) => SecureStore.getItemAsync(key),
          setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
          removeItem: (key: string) => SecureStore.deleteItemAsync(key),
        },
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  } catch (e) {
    console.warn('[supabaseClient] init failed, sync disabled', e);
    isEnabled = false;
    client = null;
  }
}

/** True si Supabase est activé (URL + anon key renseignées dans .env). */
export function isSupabaseEnabled(): boolean {
  return isEnabled;
}

/** Retourne le singleton client. Throw si non activé. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    throw new Error(
      'Supabase n\'est pas configuré. Renseignez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans .env',
    );
  }
  return client;
}

/** Retourne le client ou null si non activé (utile pour code optionnel). */
export function getSupabaseOrNull(): SupabaseClient | null {
  return client;
}

/** Stratégie de sync (auto | manual | disabled). */
export function getSyncStrategy(): 'auto' | 'manual' | 'disabled' {
  if (!isEnabled) return 'disabled';
  const strategy = process.env.EXPO_PUBLIC_SYNC_STRATEGY ?? 'auto';
  if (strategy === 'manual' || strategy === 'disabled') return strategy;
  return 'auto';
}

/** Mode de stockage des reçus par défaut (local | cloud | hybrid). */
export function getDefaultReceiptStorageMode(): 'local' | 'cloud' | 'hybrid' {
  const mode = process.env.EXPO_PUBLIC_RECEIPT_STORAGE_MODE ?? 'local';
  if (mode === 'cloud' || mode === 'hybrid') return mode;
  return 'local';
}
