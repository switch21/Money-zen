/**
 * Money-zen — Tests du moteur monétaire (Phase 0 + 48).
 * Spec section 4.4 : exactitude financière (pas d'arrondi flottant).
 * Spec section 49 : règle 4 (conversion conserve le taux historique).
 */
import { toMinor, fromMinor, convertMinor, addMinor, subMinor, formatMoney, formatPercent } from '@utils/money';

describe('Money module', () => {
  describe('toMinor / fromMinor', () => {
    test('XAF (decimals=0) — 25000 → 25000 minor', () => {
      expect(toMinor(25000, 'XAF')).toBe(25000);
      expect(fromMinor(25000, 'XAF')).toBe(25000);
    });
    test('EUR (decimals=2) — 25.50 → 2550 minor', () => {
      expect(toMinor(25.5, 'EUR')).toBe(2550);
      expect(fromMinor(2550, 'EUR')).toBe(25.5);
    });
    test('JPY (decimals=0) — 1000 → 1000 minor', () => {
      expect(toMinor(1000, 'JPY')).toBe(1000);
      expect(fromMinor(1000, 'JPY')).toBe(1000);
    });
    test('USD (decimals=2) — 50 → 5000 minor', () => {
      expect(toMinor(50, 'USD')).toBe(5000);
      expect(fromMinor(5000, 'USD')).toBe(50);
    });
    test('arrondi — 25.555 EUR → 2556 minor (round)', () => {
      expect(toMinor(25.555, 'EUR')).toBe(2556);
    });
  });

  describe('addMinor / subMinor', () => {
    test('addition', () => {
      expect(addMinor(100, 200)).toBe(300);
    });
    test('soustraction', () => {
      expect(subMinor(500, 200)).toBe(300);
      expect(subMinor(200, 500)).toBe(-300);
    });
  });

  describe('convertMinor', () => {
    test('même devise → identité', () => {
      expect(convertMinor(25000, 'XAF', 'XAF', 1.0)).toBe(25000);
    });
    test('XAF → XAF (mêmes decimals=0) → * rate', () => {
      expect(convertMinor(25000, 'XAF', 'EUR', 0.001525)).toBe(Math.round(25000 * 0.001525 * 100));
    });
    test('EUR → USD — 2550 minor EUR (25.50 EUR) × 1.08 → 2754 minor USD', () => {
      const result = convertMinor(2550, 'EUR', 'USD', 1.08);
      expect(result).toBe(Math.round(25.5 * 1.08 * 100)); // 2754
    });
    test('USD → XAF (decimals 2→0)', () => {
      const rate = 560; // 1 USD = 560 XAF
      const result = convertMinor(5000, 'USD', 'XAF', rate); // 50 USD × 560 = 28000 XAF
      expect(result).toBe(28000);
    });
  });

  describe('formatMoney', () => {
    test('XAF avec symbole', () => {
      expect(formatMoney(25000, 'XAF', 'fr', { showSymbol: true })).toContain('25 000');
      expect(formatMoney(25000, 'XAF', 'fr', { showSymbol: true })).toContain('FCFA');
    });
    test('EUR avec symbole', () => {
      expect(formatMoney(2550, 'EUR', 'fr', { showSymbol: true })).toContain('25,50');
      expect(formatMoney(2550, 'EUR', 'fr', { showSymbol: true })).toContain('€');
    });
    test('USD avec symbole avant', () => {
      expect(formatMoney(5000, 'USD', 'en', { showSymbol: true })).toContain('$50.00');
    });
  });

  describe('formatPercent', () => {
    test('FR', () => {
      expect(formatPercent(18.5, 'fr')).toBe('18,5 %');
    });
    test('EN', () => {
      expect(formatPercent(18.5, 'en')).toBe('18.5 %');
    });
  });
});
