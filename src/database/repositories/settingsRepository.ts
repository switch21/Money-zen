/**
 * Money-zen — Repository : Settings (singleton user_settings + security + notifications).
 */
import { getDatabase, withTransaction } from '@database/sqlite';
import type { NotificationSettings, SecuritySettings, UserSettings } from '@types/index';

interface SettingsRow {
  baseCurrency: string;
  language: 'fr' | 'en';
  themePreference: 'light' | 'dark' | 'system';
  isDemoMode: number;
  isOnboardingComplete: number;
  lastSyncedAt: string | null;
}

interface SecurityRow {
  isPinEnabled: number;
  pinHash: string | null;
  isBiometricEnabled: number;
  autoLockDelaySeconds: number;
}

interface NotificationRow {
  enableReminder: number;
  enableBudgetWarning: number;
  enableBudgetOver: number;
  enableRecurring: number;
  enableGoalUpdates: number;
  enableWeeklySummary: number;
  reminderHour: number;
}

export function loadUserSettings(): UserSettings | null {
  const db = getDatabase();
  const settingsRow = db.getFirstSync<SettingsRow>(`SELECT * FROM user_settings WHERE id = 'singleton';`);
  if (!settingsRow) return null;

  const securityRow =
    db.getFirstSync<SecurityRow>(`SELECT * FROM security_settings WHERE id = 'singleton';`) ?? null;
  const notifRow =
    db.getFirstSync<NotificationRow>(`SELECT * FROM notification_settings WHERE id = 'singleton';`) ?? null;

  return {
    baseCurrency: settingsRow.baseCurrency,
    language: settingsRow.language,
    themePreference: settingsRow.themePreference,
    isDemoMode: settingsRow.isDemoMode === 1,
    isOnboardingComplete: settingsRow.isOnboardingComplete === 1,
    lastSyncedAt: settingsRow.lastSyncedAt,
    security: {
      isPinEnabled: (securityRow?.isPinEnabled ?? 0) === 1,
      pinHash: securityRow?.pinHash ?? null,
      isBiometricEnabled: (securityRow?.isBiometricEnabled ?? 0) === 1,
      autoLockDelaySeconds: securityRow?.autoLockDelaySeconds ?? 0,
    },
    notifications: {
      enableReminder: (notifRow?.enableReminder ?? 1) === 1,
      enableBudgetWarning: (notifRow?.enableBudgetWarning ?? 1) === 1,
      enableBudgetOver: (notifRow?.enableBudgetOver ?? 1) === 1,
      enableRecurring: (notifRow?.enableRecurring ?? 1) === 1,
      enableGoalUpdates: (notifRow?.enableGoalUpdates ?? 1) === 1,
      enableWeeklySummary: (notifRow?.enableWeeklySummary ?? 1) === 1,
      reminderHour: notifRow?.reminderHour ?? 20,
    },
  };
}

export function saveUserSettings(settings: UserSettings): void {
  withTransaction(() => {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.runSync(
      `INSERT INTO user_settings (id, baseCurrency, language, themePreference, isDemoMode, isOnboardingComplete, lastSyncedAt, updatedAt)
       VALUES ('singleton', ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         baseCurrency = excluded.baseCurrency,
         language = excluded.language,
         themePreference = excluded.themePreference,
         isDemoMode = excluded.isDemoMode,
         isOnboardingComplete = excluded.isOnboardingComplete,
         lastSyncedAt = excluded.lastSyncedAt,
         updatedAt = excluded.updatedAt;`,
      [
        settings.baseCurrency,
        settings.language,
        settings.themePreference,
        settings.isDemoMode ? 1 : 0,
        settings.isOnboardingComplete ? 1 : 0,
        settings.lastSyncedAt,
        now,
      ],
    );
    db.runSync(
      `INSERT INTO security_settings (id, isPinEnabled, pinHash, isBiometricEnabled, autoLockDelaySeconds, updatedAt)
       VALUES ('singleton', ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         isPinEnabled = excluded.isPinEnabled,
         pinHash = excluded.pinHash,
         isBiometricEnabled = excluded.isBiometricEnabled,
         autoLockDelaySeconds = excluded.autoLockDelaySeconds,
         updatedAt = excluded.updatedAt;`,
      [
        settings.security.isPinEnabled ? 1 : 0,
        settings.security.pinHash,
        settings.security.isBiometricEnabled ? 1 : 0,
        settings.security.autoLockDelaySeconds,
        now,
      ],
    );
    db.runSync(
      `INSERT INTO notification_settings (id, enableReminder, enableBudgetWarning, enableBudgetOver, enableRecurring, enableGoalUpdates, enableWeeklySummary, reminderHour, updatedAt)
       VALUES ('singleton', ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         enableReminder = excluded.enableReminder,
         enableBudgetWarning = excluded.enableBudgetWarning,
         enableBudgetOver = excluded.enableBudgetOver,
         enableRecurring = excluded.enableRecurring,
         enableGoalUpdates = excluded.enableGoalUpdates,
         enableWeeklySummary = excluded.enableWeeklySummary,
         reminderHour = excluded.reminderHour,
         updatedAt = excluded.updatedAt;`,
      [
        settings.notifications.enableReminder ? 1 : 0,
        settings.notifications.enableBudgetWarning ? 1 : 0,
        settings.notifications.enableBudgetOver ? 1 : 0,
        settings.notifications.enableRecurring ? 1 : 0,
        settings.notifications.enableGoalUpdates ? 1 : 0,
        settings.notifications.enableWeeklySummary ? 1 : 0,
        settings.notifications.reminderHour,
        now,
      ],
    );
  });
}

/** Crée les rows singleton avec les valeurs par défaut si elles n'existent pas. */
export function ensureSettingsSingletonExists(): void {
  const db = getDatabase();
  db.runSync(
    `INSERT OR IGNORE INTO user_settings (id, baseCurrency, language, themePreference, isDemoMode, isOnboardingComplete)
     VALUES ('singleton', 'XAF', 'fr', 'system', 0, 0);`,
  );
  db.runSync(
    `INSERT OR IGNORE INTO security_settings (id, isPinEnabled, pinHash, isBiometricEnabled, autoLockDelaySeconds)
     VALUES ('singleton', 0, NULL, 0, 0);`,
  );
  db.runSync(
    `INSERT OR IGNORE INTO notification_settings (id, enableReminder, enableBudgetWarning, enableBudgetOver, enableRecurring, enableGoalUpdates, enableWeeklySummary, reminderHour)
     VALUES ('singleton', 1, 1, 1, 1, 1, 1, 20);`,
  );
}

export function updateLastSyncedAt(date: string | null): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE user_settings SET lastSyncedAt = ?, updatedAt = ? WHERE id = 'singleton';`,
    [date, new Date().toISOString()],
  );
}
