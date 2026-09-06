/**
 * Money-zen — SecurityService (Phase 11).
 *
 * Spec section 32 :
 *   - PIN (activation, changement, confirmation, verrouillage)
 *   - Biométrie (empreinte, Face ID) si disponible
 *   - Auto-lock (immédiat, 1m, 5m, 15m, jamais)
 *   - PIN jamais en clair.
 *
 * Implémentation :
 *   - PIN stocké sous forme de hash SHA-256 dans Expo SecureStore (jamais en SQLite).
 *   - Biométrie via expo-local-authentication.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

import { useSettingsStore } from '@stores/settingsStore';
import type { SecuritySettings } from '@types/index';
import { MoneyZenError } from '@types/index';

const PIN_STORAGE_KEY = 'moneyzen.pin.hash';
const PIN_STORAGE_SALT_KEY = 'moneyzen.pin.salt';

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = `${salt}:${pin}:moneyzen`;
  const digest = await Crypto.digestStringAsync(data, Crypto.CryptoDigestAlgorithm.SHA256);
  return digest;
}

function generateSalt(): string {
  const bytes = Crypto.randomBytes(16);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const SecurityService = {
  /**
   * Active un PIN. Le hashe et le stocke dans SecureStore.
   * Spec : "Ne jamais enregistrer le PIN en clair."
   */
  async enablePin(pin: string): Promise<void> {
    if (pin.length < 4) {
      throw new MoneyZenError('PIN_INVALID', 'PIN doit faire au moins 4 chiffres.');
    }
    const salt = generateSalt();
    const hash = await hashPin(pin, salt);
    await SecureStore.setItemAsync(PIN_STORAGE_SALT_KEY, salt);
    await SecureStore.setItemAsync(PIN_STORAGE_KEY, hash);
    useSettingsStore.getState().updateSecurity({ isPinEnabled: true, pinHash: hash });
  },

  /** Désactive le PIN. */
  async disablePin(): Promise<void> {
    await SecureStore.deleteItemAsync(PIN_STORAGE_KEY);
    await SecureStore.deleteItemAsync(PIN_STORAGE_SALT_KEY);
    useSettingsStore.getState().updateSecurity({ isPinEnabled: false, pinHash: null });
  },

  /** Change le PIN. Nécessite de connaître l'ancien. */
  async changePin(oldPin: string, newPin: string): Promise<void> {
    if (!(await this.verifyPin(oldPin))) {
      throw new MoneyZenError('PIN_INVALID', 'Ancien PIN incorrect.');
    }
    await this.enablePin(newPin);
  },

  /** Vérifie un PIN saisi. */
  async verifyPin(pin: string): Promise<boolean> {
    const salt = await SecureStore.getItemAsync(PIN_STORAGE_SALT_KEY);
    const storedHash = await SecureStore.getItemAsync(PIN_STORAGE_KEY);
    if (!salt || !storedHash) {
      throw new MoneyZenError('PIN_NOT_SET', 'Aucun PIN configuré.');
    }
    const hash = await hashPin(pin, salt);
    return hash === storedHash;
  },

  /** Vérifie si la biométrie est disponible sur l'appareil. */
  async isBiometricAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  /** Active la biométrie. */
  async enableBiometric(): Promise<void> {
    const available = await this.isBiometricAvailable();
    if (!available) {
      throw new MoneyZenError('BIOMETRIC_UNAVAILABLE', 'Biométrie non disponible ou non configurée sur cet appareil.');
    }
    useSettingsStore.getState().updateSecurity({ isBiometricEnabled: true });
  },

  async disableBiometric(): Promise<void> {
    useSettingsStore.getState().updateSecurity({ isBiometricEnabled: false });
  },

  /** Authentifie via biométrie. */
  async authenticateBiometric(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Déverrouillez Money-zen',
      fallbackLabel: 'Utiliser le PIN',
    });
    return result.success;
  },

  /** Déverrouille l'app : tente biométrie d'abord, fallback PIN si configuré. */
  async unlock(): Promise<boolean> {
    const settings = useSettingsStore.getState().settings.security;
    if (settings.isBiometricEnabled) {
      try {
        const ok = await this.authenticateBiometric();
        if (ok) return true;
      } catch {
        // fall through to PIN
      }
    }
    return false; // Le user devra saisir son PIN via l'écran de lock.
  },

  /** Vérifie si l'auto-lock doit déclencher. */
  shouldAutoLock(lastActiveAt: number, settings: SecuritySettings): boolean {
    if (!settings.isPinEnabled) return false;
    if (settings.autoLockDelaySeconds < 0) return false; // jamais
    if (settings.autoLockDelaySeconds === 0) return true; // immédiatement
    return Date.now() - lastActiveAt >= settings.autoLockDelaySeconds * 1000;
  },
};
