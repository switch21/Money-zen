/**
 * Money-zen — Représentation monétaire sûre (spec section 4.4).
 *
 * "Les montants ne doivent jamais être calculés avec des mécanismes
 * susceptibles de provoquer des erreurs d'arrondi liées aux nombres flottants."
 *
 * Solution : on stocke TOUJOURS les montants en unités mineures entières (Minor).
 * Pour XAF (decimals=0), 1 unit = 1 minor.
 * Pour EUR (decimals=2), 1€ = 100 minor.
 * Pour JPY (decimals=0), 1¥ = 1 minor.
 *
 * Le type `MoneyMinor` (alias de number) est utilisé partout dans le domaine.
 * Aucune opération flottante sur les montants en dehors de ce fichier.
 */
import type { Currency, CurrencyCode, MoneyMinor } from '@types/index';
import { findCurrencyByCode } from '@constants/currencies';
import { MoneyZenError } from '@types/index';

/**
 * Convertit un montant décimal (saisi utilisateur) en unités mineures entières.
 * ex. 25.50 EUR → 2550 minor
 *     25000 XAF → 25000 minor
 */
export function toMinor(decimalAmount: number, currencyCode: CurrencyCode): MoneyMinor {
  const currency = findCurrencyByCode(currencyCode);
  if (!currency) {
    throw new MoneyZenError('INVALID_CURRENCY', `Devise inconnue : ${currencyCode}`);
  }
  const decimals = currency.decimals ?? 0;
  if (decimals === 0) {
    return Math.round(decimalAmount);
  }
  // Multiplication par 10^decimals puis arrondi entier.
  const factor = Math.pow(10, decimals);
  return Math.round(decimalAmount * factor);
}

/**
 * Convertit un montant en unités mineures en montant décimal pour affichage.
 * ex. 2550 minor → 25.5 EUR
 *     25000 minor → 25000 XAF
 */
export function fromMinor(minor: MoneyMinor, currencyCode: CurrencyCode): number {
  const currency = findCurrencyByCode(currencyCode);
  if (!currency) {
    throw new MoneyZenError('INVALID_CURRENCY', `Devise inconnue : ${currencyCode}`);
  }
  const decimals = currency.decimals ?? 0;
  if (decimals === 0) {
    return minor;
  }
  const factor = Math.pow(10, decimals);
  return minor / factor;
}

/**
 * Additionne deux montants en unités mineures (même devise).
 */
export function addMinor(a: MoneyMinor, b: MoneyMinor): MoneyMinor {
  return a + b;
}

/**
 * Soustrait b de a (même devise).
 */
export function subMinor(a: MoneyMinor, b: MoneyMinor): MoneyMinor {
  return a - b;
}

/**
 * Convertit un montant d'une devise vers une autre en utilisant un taux.
 * Le résultat est en unités mineures de la devise cible.
 *
 * Mathématiquement : `targetMinor = round(sourceMinor * rate * target.decimalsFactor / source.decimalsFactor)`
 *
 * Pour le taux : 1 unité de sourceCurrency vaut `rate` unités de targetCurrency.
 * Mais on travaille en unités mineures. Si source et target ont le même nombre
 * de décimales, le calcul est direct : sourceMinor * rate.
 * Sinon il faut normaliser.
 */
export function convertMinor(
  sourceMinor: MoneyMinor,
  sourceCurrency: CurrencyCode,
  targetCurrency: CurrencyCode,
  rate: number,
): MoneyMinor {
  if (sourceCurrency === targetCurrency) {
    return sourceMinor;
  }
  const source = findCurrencyByCode(sourceCurrency);
  const target = findCurrencyByCode(targetCurrency);
  if (!source || !target) {
    throw new MoneyZenError('INVALID_CURRENCY', `Conversion impossible : ${sourceCurrency} → ${targetCurrency}`);
  }
  // 1. On convertit sourceMinor vers la "valeur absolue" (en unité majeure de la source).
  const sourceMajor = sourceMinor / Math.pow(10, source.decimals);
  // 2. On applique le taux pour obtenir la valeur en unité majeure de la cible.
  const targetMajor = sourceMajor * rate;
  // 3. On convertit vers les unités mineures de la cible, en arrondissant.
  const targetMinor = Math.round(targetMajor * Math.pow(10, target.decimals));
  return targetMinor;
}

/**
 * Formate un montant en unités mineures pour l'affichage, selon les conventions locales.
 * Respecte : séparateurs, décimales, symboles, codes ISO (spec section 54).
 */
export function formatMoney(
  minor: MoneyMinor,
  currencyCode: CurrencyCode,
  locale: 'fr' | 'en' = 'fr',
  options?: { showSymbol?: boolean; showCode?: boolean },
): string {
  const currency = findCurrencyByCode(currencyCode);
  if (!currency) {
    return `${minor} ${currencyCode}`;
  }
  const showSymbol = options?.showSymbol ?? true;
  const showCode = options?.showCode ?? false;
  const decimals = currency.decimals ?? 0;
  const major = fromMinor(minor, currencyCode);

  // Formatage des groupes (milliers) selon locale.
  const formattedNumber = formatNumber(major, decimals, locale);

  let out = formattedNumber;
  if (showSymbol) {
    out = currency.symbolPosition === 'before' ? `${currency.symbol}${formattedNumber}` : `${formattedNumber} ${currency.symbol}`;
  }
  if (showCode) {
    out = `${out} ${currencyCode}`;
  }
  return out;
}

/** Formate un nombre avec séparateurs de milliers et décimales selon locale. */
export function formatNumber(value: number, decimals: number, locale: 'fr' | 'en'): string {
  const thousandSeparator = locale === 'fr' ? ' ' : ',';
  const decimalSeparator = locale === 'fr' ? ',' : '.';

  const fixed = value.toFixed(decimals);
  const [integerPart, decimalPart] = fixed.split('.');

  // Groupes de 3 avec séparateur (right-to-left sur la partie entière).
  const groups: string[] = [];
  let s = integerPart;
  while (s.length > 3) {
    groups.unshift(s.slice(-3));
    s = s.slice(0, -3);
  }
  groups.unshift(s);
  const groupedInteger = groups.join(thousandSeparator);

  if (decimals === 0 || !decimalPart) {
    return groupedInteger;
  }
  return `${groupedInteger}${decimalSeparator}${decimalPart}`;
}

/** Pourcentages : toujours arrondis à 1 décimale, formaté selon locale. */
export function formatPercent(percent: number, locale: 'fr' | 'en' = 'fr'): string {
  const sep = locale === 'fr' ? ',' : '.';
  return `${percent.toFixed(1).replace('.', sep)} %`;
}
