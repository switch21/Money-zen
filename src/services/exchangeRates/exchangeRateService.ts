/**
 * Money-zen — ExchangeRateService (Phase 6 — Moteur multidevise).
 *
 * Spec section 16 : abstraction, jamais d'appel API direct depuis les composants.
 * Spec section 52 : fallback offline (dernier taux connu).
 *
 * Pipeline :
 *   1. Vérifier le cache local (table exchange_rates).
 *   2. Si stale (older than EXCHANGE_RATE_STALENESS_HOURS) et online → rafraîchir depuis API.
 *   3. Si offline → fallback last-known.
 *   4. Aucun taux connu → erreur OFFLINE_NO_RATE.
 */
import * as Network from 'expo-network';

import { getLatestRate, upsertRate } from '@database/repositories/exchangeRateRepository';
import { EXCHANGE_RATE_STALENESS_HOURS } from '@constants/index';
import type { CurrencyCode, ExchangeRate } from '@types/index';
import { MoneyZenError } from '@types/index';

const PROVIDER_URL: Record<string, string> = {
  frankfurter: 'https://api.frankfurter.app/latest?from={FROM}&to={TO}',
  openexchangerates: 'https://openexchangerates.org/api/latest.json?app_id={API_KEY}&symbols={TO}',
};

interface FetchOptions {
  force?: boolean; // bypass cache
  manualRate?: number; // override
}

export const ExchangeRateService = {
  /**
   * Récupère le taux pour la paire (from → to).
   * Retourne toujours une entité ExchangeRate, en fallback last-known si offline.
   */
  async getRate(from: CurrencyCode, to: CurrencyCode, options: FetchOptions = {}): Promise<ExchangeRate> {
    if (from === to) {
      // Taux identité = 1.0
      const now = new Date().toISOString();
      return {
        id: 'identity',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: 'synced',
        version: 1,
        fromCurrency: from,
        toCurrency: to,
        rate: 1.0,
        source: 'manual',
        rateDate: now,
        fetchedAt: now,
        isManualOverride: false,
      };
    }

    const cached = getLatestRate(from, to);
    const isStale = cached
      ? Date.now() - new Date(cached.rateDate).getTime() > EXCHANGE_RATE_STALENESS_HOURS * 3600 * 1000
      : true;

    const shouldRefresh = options.force || !cached || isStale;
    const networkState = await Network.getNetworkStateAsync();
    const isOnline = networkState.isInternetReachable === true;

    if (shouldRefresh && isOnline) {
      try {
        const rate = await this.fetchFromProvider(from, to);
        return upsertRate({
          fromCurrency: from,
          toCurrency: to,
          rate,
          source: 'api',
          rateDate: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[ExchangeRateService] fetch failed, fallback to cache', e);
        // fallback to cache below
      }
    }

    // Fallback last-known
    if (cached) {
      // On le marque comme last-known si on n'a pas pu rafraîchir.
      if (!isOnline) {
        return { ...cached, source: 'last-known' };
      }
      return cached;
    }

    if (options.manualRate !== undefined && options.manualRate > 0) {
      return upsertRate({
        fromCurrency: from,
        toCurrency: to,
        rate: options.manualRate,
        source: 'manual',
        rateDate: new Date().toISOString(),
        isManualOverride: true,
      });
    }

    throw new MoneyZenError(
      'OFFLINE_NO_RATE',
      `Aucun taux connu pour ${from} → ${to}. Vérifiez votre connexion.`,
    );
  },

  /** Récupère le taux pour une date historique (sans rafraîchir). */
  async getRateForDate(from: CurrencyCode, to: CurrencyCode, date: string): Promise<ExchangeRate | null> {
    if (from === to) {
      const now = new Date().toISOString();
      return {
        id: 'identity',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: 'synced',
        version: 1,
        fromCurrency: from,
        toCurrency: to,
        rate: 1.0,
        source: 'manual',
        rateDate: now,
        fetchedAt: now,
        isManualOverride: false,
      };
    }
    const cached = getLatestRate(from, to);
    if (!cached) {
      throw new MoneyZenError('OFFLINE_NO_RATE', `Aucun taux pour ${from} → ${to} à la date ${date}.`);
    }
    return cached;
  },

  /** Appel API (Frankfurter par défaut, gratuite, pas de clé). */
  async fetchFromProvider(from: CurrencyCode, to: CurrencyCode): Promise<number> {
    const provider = (process.env.EXPO_PUBLIC_EXCHANGE_RATE_PROVIDER ?? 'frankfurter') as string;
    const url = (PROVIDER_URL[provider] ?? PROVIDER_URL.frankfurter)
      .replace('{FROM}', from)
      .replace('{TO}', to)
      .replace('{API_KEY}', process.env.EXPO_PUBLIC_EXCHANGE_RATE_API_KEY ?? '');

    const response = await fetch(url);
    if (!response.ok) {
      throw new MoneyZenError('OFFLINE_NO_RATE', `HTTP ${response.status} depuis ${provider}`);
    }
    const data = await response.json();
    // Frankfurter : { rates: { TO: rate } }
    if (data?.rates?.[to]) {
      return data.rates[to] as number;
    }
    throw new MoneyZenError('OFFLINE_NO_RATE', `Réponse inattendue : ${JSON.stringify(data).slice(0, 200)}`);
  },
};
