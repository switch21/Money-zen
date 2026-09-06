/**
 * Money-zen — Catalogue des devises supportées.
 * Le catalogue est extensible : l'utilisateur peut ajouter n'importe quelle devise ISO 4217.
 * Source des conventions : ISO 4217, Banque de France, Banque Centrale des États de l'Afrique (BEAC).
 */
import type { Currency } from '@types/index';

export const CURRENCY_CATALOG: Omit<Currency, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'syncStatus' | 'version' | 'isEnabled'>[] = [
  {
    code: 'XAF',
    name: 'Franc CFA BEAC',
    symbol: 'FCFA',
    countryCode: 'CM',
    decimals: 0,
    isMinorUnit: true,
    flag: '🇨🇲',
    symbolPosition: 'after',
  },
  {
    code: 'XOF',
    name: 'Franc CFA BCEAO',
    symbol: 'CFA',
    countryCode: 'SN',
    decimals: 0,
    isMinorUnit: true,
    flag: '🇸🇳',
    symbolPosition: 'after',
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    countryCode: 'EU',
    decimals: 2,
    isMinorUnit: false,
    flag: '🇪🇺',
    symbolPosition: 'after',
  },
  {
    code: 'USD',
    name: 'Dollar américain',
    symbol: '$',
    countryCode: 'US',
    decimals: 2,
    isMinorUnit: false,
    flag: '🇺🇸',
    symbolPosition: 'before',
  },
  {
    code: 'GBP',
    name: 'Livre sterling',
    symbol: '£',
    countryCode: 'GB',
    decimals: 2,
    isMinorUnit: false,
    flag: '🇬🇧',
    symbolPosition: 'before',
  },
  {
    code: 'MAD',
    name: 'Dirham marocain',
    symbol: 'DH',
    countryCode: 'MA',
    decimals: 2,
    isMinorUnit: false,
    flag: '🇲🇦',
    symbolPosition: 'after',
  },
  {
    code: 'CAD',
    name: 'Dollar canadien',
    symbol: 'C$',
    countryCode: 'CA',
    decimals: 2,
    isMinorUnit: false,
    flag: '🇨🇦',
    symbolPosition: 'before',
  },
  {
    code: 'CHF',
    name: 'Franc suisse',
    symbol: 'CHF',
    countryCode: 'CH',
    decimals: 2,
    isMinorUnit: false,
    flag: '🇨🇭',
    symbolPosition: 'before',
  },
  {
    code: 'JPY',
    name: 'Yen japonais',
    symbol: '¥',
    countryCode: 'JP',
    decimals: 0,
    isMinorUnit: true,
    flag: '🇯🇵',
    symbolPosition: 'before',
  },
  {
    code: 'CNY',
    name: 'Yuan chinois',
    symbol: '¥',
    countryCode: 'CN',
    decimals: 2,
    isMinorUnit: false,
    flag: '🇨🇳',
    symbolPosition: 'before',
  },
  {
    code: 'NGN',
    name: 'Naira nigérian',
    symbol: '₦',
    countryCode: 'NG',
    decimals: 2,
    isMinorUnit: false,
    flag: '🇳🇬',
    symbolPosition: 'before',
  },
  {
    code: 'GHS',
    name: 'Cedi ghanéen',
    symbol: '₵',
    countryCode: 'GH',
    decimals: 2,
    isMinorUnit: false,
    flag: '🇬🇭',
    symbolPosition: 'before',
  },
];

export const DEFAULT_CURRENCY_CODES: string[] = ['XAF'];

export function findCurrencyByCode(code: string): Currency | undefined {
  return CURRENCY_CATALOG.find((c) => c.code === code);
}
