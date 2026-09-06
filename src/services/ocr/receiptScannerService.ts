/**
 * Money-zen — ReceiptScannerService (Phase 17 — OCR/IA).
 *
 * Refactoré pour gérer 4 clés OCR.space en failover (anti-exhaustion de quota).
 *
 * Stratégie :
 *   1. Essaye la clé courante (round-robin).
 *   2. Si quota dépassé → marque clé comme épuisée pour le mois, passe à la suivante.
 *   3. Si toutes épuisées → erreur avec message clair.
 *
 * Persistance :
 *   - État des clés (exhaustedAt, monthlyUsage) stocké dans SecureStore
 *   - Reset mensuel automatique (au 1er du mois, on réactive toutes les clés)
 *   - Audit trail dans la table `ocr_usage` (migration 0002)
 *
 * Sécurité :
 *   - Les 4 clés sont dans EXPO_PUBLIC_* → embarquées dans le bundle (extractibles).
 *   - Mitigation : limite à EXPO_PUBLIC_OCR_USER_MONTHLY_LIMIT scans/user/mois côté app
 *   - Mitigation définitive (V2+) : déplacer les clés dans Supabase Edge Function.
 *
 * Spec section 30 : ReceiptScannerService (futur).
 * Spec section 17 : préparer l'architecture.
 */
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

import {
  recordOcrUsage,
  getOcrUsageForUserThisMonth,
  getOcrUsageByKeyThisMonth,
} from '@database/repositories/receiptRepository';
import { AuthService } from '@services/sync/authService';
import { MoneyZenError } from '@types/index';

const OCR_KEYS = [
  process.env.EXPO_PUBLIC_OCR_API_KEY_1,
  process.env.EXPO_PUBLIC_OCR_API_KEY_2,
  process.env.EXPO_PUBLIC_OCR_API_KEY_3,
  process.env.EXPO_PUBLIC_OCR_API_KEY_4,
].filter((k): k is string => Boolean(k) && k.length > 0);

const USER_MONTHLY_LIMIT = Number(process.env.EXPO_PUBLIC_OCR_USER_MONTHLY_LIMIT ?? 10);
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const STATE_KEY = 'moneyzen.ocr.keys.state';

interface KeyState {
  index: number;
  exhaustedAt: number | null;
  monthlyUsage: number;
}

export interface OcrResult {
  merchant?: string;
  amountMinor?: number;
  currency?: string;
  date?: string;
  lines?: Array<{ description: string; amountMinor: number }>;
  confidence: number; // 0..1
  rawText?: string;
}

export const ReceiptScannerService = {
  isAvailable(): boolean {
    return OCR_KEYS.length > 0;
  },

  getKeyCount(): number {
    return OCR_KEYS.length;
  },

  /**
   * Scanne un reçu avec failover multi-clés.
   * @param filePath chemin local de l'image
   */
  async scanReceipt(filePath: string): Promise<OcrResult> {
    if (!this.isAvailable()) {
      throw new MoneyZenError('UNKNOWN', 'OCR non disponible. Configurez EXPO_PUBLIC_OCR_API_KEY_1..4 dans .env');
    }

    // Vérifie la limite utilisateur mensuelle (anti-abus)
    const userId = (await AuthService.getCurrentUser())?.id ?? null;
    const userUsage = getOcrUsageForUserThisMonth(userId);
    if (userUsage >= USER_MONTHLY_LIMIT) {
      throw new MoneyZenError(
        'UNKNOWN',
        `Limite mensuelle atteinte (${USER_MONTHLY_LIMIT} scans/user/mois). Passez à Premium ou réessayez le mois prochain.`,
      );
    }

    // Vérifie que le fichier existe
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new MoneyZenError('UNKNOWN', `Fichier introuvable : ${filePath}`);
    }

    // Charge l'état des clés
    const keyStates = await this.loadKeyStates();
    this.resetIfNewMonth(keyStates);

    // Essaye chaque clé en round-robin + failover
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < OCR_KEYS.length; attempt++) {
      const idx = (this.findCurrentKey(keyStates) + attempt) % OCR_KEYS.length;
      const state = keyStates[idx];

      if (this.isExhausted(state)) {
        continue;
      }

      try {
        const result = await this.callOcrSpace(OCR_KEYS[idx], filePath);
        state.monthlyUsage++;
        await this.saveKeyStates(keyStates);

        // Audit trail
        recordOcrUsage({
          userId,
          keyIndex: idx,
          success: true,
          errorCode: null,
          fileSizeBytes: fileInfo.size ?? null,
          receiptId: null,
        });

        return result;
      } catch (e) {
        const errorMsg = (e as Error).message ?? '';
        if (this.isQuotaError(errorMsg)) {
          state.exhaustedAt = Date.now();
          await this.saveKeyStates(keyStates);
          recordOcrUsage({
            userId,
            keyIndex: idx,
            success: false,
            errorCode: 'QUOTA_EXCEEDED',
            fileSizeBytes: fileInfo.size ?? null,
            receiptId: null,
          });
          continue;
        }
        // Autre erreur (image invalide, réseau, etc.)
        recordOcrUsage({
          userId,
          keyIndex: idx,
          success: false,
          errorCode: errorMsg.slice(0, 100),
          fileSizeBytes: fileInfo.size ?? null,
          receiptId: null,
        });
        lastError = e as Error;
      }
    }

    throw new MoneyZenError(
      'UNKNOWN',
      `Toutes les clés OCR sont épuisées pour ce mois. Dernière erreur : ${lastError?.message ?? 'inconnue'}`,
    );
  },

  /**
   * Statut des clés OCR pour affichage dans Settings.
   */
  async getKeyStatus(): Promise<Array<{
    index: number;
    isAvailable: boolean;
    exhaustedAt: number | null;
    monthlyUsage: number;
    willResetAt: number;
  }>> {
    const keyStates = await this.loadKeyStates();
    return keyStates.map((s, idx) => ({
      index: idx,
      isAvailable: !this.isExhausted(s),
      exhaustedAt: s.exhaustedAt,
      monthlyUsage: s.monthlyUsage,
      willResetAt: s.exhaustedAt ? s.exhaustedAt + MONTH_MS : 0,
    }));
  },

  /** Total des scans restants ce mois (toutes clés confondues). */
  async getRemainingScansThisMonth(): Promise<number> {
    const states = await this.loadKeyStates();
    const totalUsed = states.reduce((acc, s) => acc + s.monthlyUsage, 0);
    const totalCapacity = OCR_KEYS.length * 25000; // 25k/clé/mois sur OCR.space
    return Math.max(0, totalCapacity - totalUsed);
  },

  // ─── Internes ──────────────────────────────────────────────────────────

  /** Appel à l'API OCR.space. */
  async callOcrSpace(apiKey: string, filePath: string): Promise<OcrResult> {
    const base64 = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const formData = new FormData();
    formData.append('apikey', apiKey);
    formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
    formData.append('language', 'fra');
    formData.append('isOverlayRequired', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Engine 2 = meilleur pour reçus

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage ?? 'OCR processing error');
    }

    const parsed = data.ParsedResults?.[0];
    if (!parsed) {
      throw new Error('Aucun résultat OCR');
    }

    // Extraction basique (à améliorer avec regex + ML)
    const text = parsed.ParsedText ?? '';
    return {
      rawText: text,
      confidence: 0.7,
      merchant: this.extractMerchant(text),
      amountMinor: this.extractAmount(text),
      currency: this.extractCurrency(text),
      date: this.extractDate(text),
      lines: [],
    };
  },

  isQuotaError(message: string): boolean {
    return /quota|limit exceeded|too many requests|429/i.test(message);
  },

  isExhausted(state: KeyState): boolean {
    if (!state.exhaustedAt) return false;
    return Date.now() - state.exhaustedAt < MONTH_MS;
  },

  findCurrentKey(states: KeyState[]): number {
    for (let i = 0; i < states.length; i++) {
      if (!this.isExhausted(states[i])) return i;
    }
    return 0; // fallback, toutes épuisées
  },

  resetIfNewMonth(states: KeyState[]): void {
    for (const s of states) {
      if (s.exhaustedAt && Date.now() - s.exhaustedAt >= MONTH_MS) {
        s.exhaustedAt = null;
        s.monthlyUsage = 0;
      }
    }
  },

  async loadKeyStates(): Promise<KeyState[]> {
    try {
      const raw = await SecureStore.getItemAsync(STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as KeyState[];
        if (Array.isArray(parsed) && parsed.length === OCR_KEYS.length) return parsed;
      }
    } catch (e) {
      console.warn('[OCR] loadKeyStates failed:', e);
    }
    // Init fresh
    return OCR_KEYS.map((_, index) => ({ index, exhaustedAt: null, monthlyUsage: 0 }));
  },

  async saveKeyStates(states: KeyState[]): Promise<void> {
    try {
      await SecureStore.setItemAsync(STATE_KEY, JSON.stringify(states));
    } catch (e) {
      console.warn('[OCR] saveKeyStates failed:', e);
    }
  },

  // ─── Extraction heuristique (V1, à enrichir en V2) ─────────────────────

  extractMerchant(text: string): string | undefined {
    // Première ligne non vide du texte OCR — souvent le marchand.
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    return lines[0] ?? undefined;
  },

  extractAmount(text: string): number | undefined {
    // Cherche un montant type "TOTAL 25 000" ou "Total: 25.50"
    const matches = text.match(/(?:total|montant|amount)\s*:?\s*(\d{1,3}(?:[ ,]?\d{3})*(?:[.,]\d{2})?)/i);
    if (matches && matches[1]) {
      const num = parseFloat(matches[1].replace(/[ ,]/g, ''));
      if (!Number.isNaN(num)) {
        // Heuristique : si < 100, c'est probablement EUR/USD (2 décimales).
        // Pour XAF, on stocke en mineurs (entiers).
        // On renvoie le montant en mineurs (à corriger selon devise).
        return num >= 100 ? Math.round(num) : Math.round(num * 100);
      }
    }
    return undefined;
  },

  extractCurrency(text: string): string | undefined {
    if (/XAF|FCFA|CFA franc/i.test(text)) return 'XAF';
    if (/EUR|€/i.test(text)) return 'EUR';
    if (/USD|\$/i.test(text)) return 'USD';
    if (/GBP|£/i.test(text)) return 'GBP';
    return undefined;
  },

  extractDate(text: string): string | undefined {
    // Cherche une date type "05/09/2026" ou "2026-09-05"
    const match = text.match(/(\d{2})[/.-](\d{2})[/.-](\d{4})/) ?? text.match(/(\d{4})-(\d{2})-(\d{2})/);
    return match?.[0];
  },
};
