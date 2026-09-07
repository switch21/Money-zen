/**
 * Money-zen — Setup i18n avec FR + EN.
 *
 * FR par défaut (spec section 5).
 * Compatible SSR (Expo Router web) et runtime natif.
 *
 * NOTE : On n'utilise pas `i18n.translations = ...` directement car en SSR
 * Expo Router, l'objet `i18n` importé peut être undefined au premier render.
 * On utilise `i18n.translations = {...}` uniquement côté client, et on
 * définit `i18n.locale` via une méthode défensive.
 */
import i18n from 'i18n-js';

import { fr } from './fr';
import { en } from './en';
import type { UserSettings } from '@types/index';

// Assignation défensive — si i18n est undefined (SSR), on skip sans crash.
try {
  if (i18n && typeof i18n === 'object') {
    i18n.translations = { fr, en };
    i18n.defaultLocale = 'fr';
    i18n.fallbacks = true;
    i18n.locale = 'fr';
  } else {
    console.warn('[i18n] i18n-js import returned undefined — translations not set');
  }
} catch (e) {
  console.warn('[i18n] Failed to set translations:', e);
}

export type TranslationKey = keyof typeof fr | keyof typeof en;

export function setAppLanguage(language: UserSettings['language']): void {
  try {
    if (i18n && typeof i18n === 'object') {
      i18n.locale = language;
    }
  } catch (e) {
    console.warn('[i18n] setAppLanguage failed:', e);
  }
}

/** Récupère la traduction avec interpolation {{var}}. */
export function t(key: TranslationKey, options?: Record<string, string | number>): string {
  try {
    if (i18n && typeof i18n === 'object' && typeof i18n.t === 'function') {
      const result = i18n.t(key, options);
      if (typeof result === 'string' && result.length > 0) {
        return result;
      }
    }
    // Fallback : cherche dans fr directement (si i18n-js a échoué)
    return fr[key as keyof typeof fr] ?? en[key as keyof typeof en] ?? String(key);
  } catch (e) {
    // Dernier fallback : retourne la clé elle-même
    return String(key);
  }
}

export { i18n };
