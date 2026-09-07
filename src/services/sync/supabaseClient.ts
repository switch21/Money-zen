/**
 * Money-zen — Supabase Client (singleton).
 *
 * Charge la config depuis les variables d'environnement EXPO_PUBLIC_*.
 * Détecte automatiquement si Supabase est activé (URL + ANON_KEY renseignés).
 *
 * Spec section 37 : préparer l'architecture pour Supabase.
 * Spec section 38 : chaque entité synchronisable a syncStatus, version, updatedAt, deletedAt.
 *
 * ⚠️  COMPATIBILITÉ WEB :
 *   - expo-secure-store n'a pas d'implémentation web → crash en SSR
 *   - Solution : storage platform-aware (SecureStore sur native, localStorage sur web)
 *   - Le client est initialisé LAZILY (pas au module load) pour éviter les crashes SSR
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let client: SupabaseClient | null = null;
let isEnabled = false;

// ─── Storage platform-aware ────────────────────────────────────────────────
// Sur native : Expo SecureStore (chiffré, persistant)
// Sur web : localStorage (pas chiffré mais acceptable pour une web app)
//   Note: en SSR (Node.js), ni l'un ni l'autre → storage in-memory

interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

function createStorage(): StorageAdapter {
  // SSR (Node.js pendant le build Expo Router web) → in-memory
  if (typeof window === 'undefined') {
    const memStore = new Map<string, string>();
    return {
      getItem: async (k) => memStore.get(k) ?? null,
      setItem: async (k, v) => { memStore.set(k, v); },
      removeItem: async (k) => { memStore.delete(k); },
    };
  }

  // Web → localStorage
  if (Platform.OS === 'web') {
    return {
      getItem: async (k) => window.localStorage.getItem(k),
      setItem: async (k, v) => window.localStorage.setItem(k, v),
      removeItem: async (k) => window.localStorage.removeItem(k),
    };
  }

  // Native → Expo SecureStore (import dynamique pour éviter le crash web)
  // Note: l'import dynamique ne marche pas en SSR, donc on le fait seulement
  // quand on est sûr d'être sur native.
  let SecureStoreModule: typeof import('expo-secure-store') | null = null;
  try {
    // require() synchrone — ne sera exécuté que sur native
    SecureStoreModule = require('expo-secure-store');
  } catch (e) {
    console.warn('[supabaseClient] expo-secure-store not available, falling back to memory');
    const memStore = new Map<string, string>();
    return {
      getItem: async (k) => memStore.get(k) ?? null,
      setItem: async (k, v) => { memStore.set(k, v); },
      removeItem: async (k) => { memStore.delete(k); },
    };
  }

  return {
    getItem: async (k) => {
      try {
        return await SecureStoreModule!.getItemAsync(k);
      } catch {
        return null;
      }
    },
    setItem: async (k, v) => {
      try {
        await SecureStoreModule!.setItemAsync(k, v);
      } catch (e) {
        console.warn('[supabaseClient] SecureStore.setItem failed:', e);
      }
    },
    removeItem: async (k) => {
      try {
        await SecureStoreModule!.deleteItemAsync(k);
      } catch {
        // ignore
      }
    },
  };
}

function initializeClient(): SupabaseClient | null {
  if (client) return client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!SUPABASE_URL.startsWith('http')) return null;

  try {
    const storage = createStorage();
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: { params: { eventsPerSecond: 5 } },
    });
    isEnabled = true;
    return client;
  } catch (e) {
    console.warn('[supabaseClient] init failed, sync disabled', e);
    isEnabled = false;
    client = null;
    return null;
  }
}

/** True si Supabase est activé (URL + anon key renseignées dans .env). */
export function isSupabaseEnabled(): boolean {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  if (!SUPABASE_URL.startsWith('http')) return false;
  // Initialize lazy pour que isEnabled soit correct
  if (!client) initializeClient();
  return isEnabled;
}

/** Retourne le singleton client. Throw si non activé. */
export function getSupabase(): SupabaseClient {
  const c = initializeClient();
  if (!c) {
    throw new Error(
      'Supabase n\'est pas configuré. Renseignez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans .env',
    );
  }
  return c;
}

/** Retourne le client ou null si non activé (utile pour code optionnel). */
export function getSupabaseOrNull(): SupabaseClient | null {
  return initializeClient();
}

/** Stratégie de sync (auto | manual | disabled). */
export function getSyncStrategy(): 'auto' | 'manual' | 'disabled' {
  if (!isSupabaseEnabled()) return 'disabled';
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
