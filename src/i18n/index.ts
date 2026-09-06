/**
 * Money-zen — Setup i18n (i18n-js) avec FR + EN.
 * FR par défaut (spec section 5).
 */
import i18n from 'i18n-js';

import { fr } from './fr';
import { en } from './en';
import type { UserSettings } from '@types/index';

i18n.translations = { fr, en };
i18n.defaultLocale = 'fr';
i18n.fallbacks = true;
i18n.locale = 'fr';

export type TranslationKey = keyof typeof fr | keyof typeof en;

export function setAppLanguage(language: UserSettings['language']): void {
  i18n.locale = language;
}

/** Récupère la traduction avec interpolation {{var}}. */
export function t(key: TranslationKey, options?: Record<string, string | number>): string {
  return i18n.t(key, options);
}

export { i18n };
