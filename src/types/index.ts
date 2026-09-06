/**
 * Money-zen — Types globaux
 * Architecture en couches : UI → Hooks → Services → Repositories → SQLite.
 * Tous les modèles métier sont définis ici en types purs (zéro dépendance).
 */

// ─── Utilitaires ─────────────────────────────────────────────────────────────
export type UUID = string;
export type ISODateString = string; // ISO 8601, e.g. '2026-09-05T14:32:00.000Z'
export type UnixTimestampMs = number;

/** Montant en unités mineures entières (cents, centimes). Toujours entier. */
export type MoneyMinor = number;

/** Code devise ISO 4217, ex. 'XAF', 'EUR', 'USD'. */
export type CurrencyCode = string;

// ─── Sync (Phase 15 — préparation dès Phase 0) ────────────────────────────────
export type SyncStatus = 'pending' | 'synced' | 'failed' | 'conflict';

export interface SyncableFields {
  id: UUID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt: ISODateString | null;
  syncStatus: SyncStatus;
  version: number;
}

// ─── Currency ─────────────────────────────────────────────────────────────────
export interface Currency extends SyncableFields {
  code: CurrencyCode; // 'XAF'
  name: string; // 'Franc CFA BEAC'
  symbol: string; // 'FCFA'
  /** Code pays ISO 3166-1 alpha-2 (optionnel). */
  countryCode?: string;
  /** Nombre de décimales usuelles (0 pour XAF/JPY, 2 pour EUR/USD). */
  decimals: 0 | 2 | 3;
  /** True si la devise est "à unités mineures entières" (XAF, JPY). */
  isMinorUnit: boolean;
  /** Drapeau emoji pour affichage UI. */
  flag?: string;
  /** Position du symbole : avant ou après le montant. */
  symbolPosition: 'before' | 'after';
  /** True si la devise est activée pour l'utilisateur. */
  isEnabled: boolean;
}

// ─── ExchangeRate ────────────────────────────────────────────────────────────
export interface ExchangeRate extends SyncableFields {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  /** Taux : 1 unité de fromCurrency vaut `rate` unités de toCurrency. */
  rate: number;
  /** Source du taux : 'manual' | 'api' | 'last-known'. */
  source: 'manual' | 'api' | 'last-known';
  /** Date du taux (JJ/MM/AAAA stocké ISO). */
  rateDate: ISODateString;
  /** Date de récupération en local. */
  fetchedAt: ISODateString;
  /** True si l'utilisateur a confirmé la valeur manuellement. */
  isManualOverride: boolean;
}

// ─── Account ─────────────────────────────────────────────────────────────────
export type AccountType =
  | 'cash'
  | 'bank'
  | 'card'
  | 'mobile_money'
  | 'savings'
  | 'crypto'
  | 'wallet'
  | 'other';

export type MobileMoneyProvider = 'orange_money' | 'mtn_momo' | 'moov_money' | 'wave' | 'other';

export interface Account extends SyncableFields {
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  /** Solde initial en unités mineures. */
  initialBalanceMinor: MoneyMinor;
  /** Solde courant, RECALCULÉ depuis le journal des transactions. */
  currentBalanceMinor: MoneyMinor;
  /** Icône emoji ou nom d'icône (Expo vector-icons). */
  icon: string;
  /** Couleur hexadécimale (token de couleur pour le theme). */
  color: string;
  /** Sous-type pour Mobile Money. */
  mobileMoneyProvider?: MobileMoneyProvider;
  /** Numéro de compte masqué (optionnel). */
  maskedNumber?: string;
  /** Notes privées. */
  notes?: string;
  /** True si archivé (caché des listes mais conservé pour l'historique). */
  isArchived: boolean;
}

// ─── Category ────────────────────────────────────────────────────────────────
export type CategoryType = 'expense' | 'income' | 'transfer' | 'savings';

export interface Category extends SyncableFields {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  /** Ordre d'affichage. */
  sortOrder: number;
  /** True si archivé. */
  isArchived: boolean;
  /** True si c'est une catégorie système (non supprimable par l'utilisateur). */
  isSystem: boolean;
}

// ─── Transaction ─────────────────────────────────────────────────────────────
export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction extends SyncableFields {
  type: TransactionType;
  accountId: UUID;
  categoryId: UUID | null;
  /** Montant original en unités mineures. */
  amountMinor: MoneyMinor;
  currencyCode: CurrencyCode;
  /** Montant converti en devise principale au moment de la transaction. */
  convertedAmountMinor: MoneyMinor;
  baseCurrencyCode: CurrencyCode;
  /** Taux utilisé au moment de la création. */
  exchangeRate: number;
  exchangeRateDate: ISODateString | null;
  /** Date de la transaction (JJ/MM/AAAA — pas la date de saisie). */
  date: ISODateString;
  description: string;
  notes?: string;
  merchant?: string;
  /** ID du reçu associé (FK receipts). */
  receiptId: UUID | null;
  /** True si lié à une récurrence. */
  isRecurring: boolean;
  recurringTransactionId: UUID | null;
  /** Pour un transfert : ID de la transaction miroir. */
  transferPairId: UUID | null;
}

// ─── Transaction Transfer (modèle séparé — règle métier #11) ─────────────────
export interface TransactionTransfer {
  id: UUID;
  transactionId: UUID;
  sourceAccountId: UUID;
  destinationAccountId: UUID;
  sourceAmountMinor: MoneyMinor;
  sourceCurrency: CurrencyCode;
  destinationAmountMinor: MoneyMinor;
  destinationCurrency: CurrencyCode;
  exchangeRate: number;
  exchangeRateDate: ISODateString | null;
  /** Frais de transfert éventuels (transaction séparée). */
  feeTransactionId: UUID | null;
  createdAt: ISODateString;
}

// ─── Budget ──────────────────────────────────────────────────────────────────
export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type BudgetStatus = 'normal' | 'warning' | 'alert' | 'over';

export interface Budget extends SyncableFields {
  name: string;
  categoryId: UUID | null;
  currencyCode: CurrencyCode;
  amountMinor: MoneyMinor;
  period: BudgetPeriod;
  /** Date de début (cycle courant). */
  startDate: ISODateString;
  /** Date de fin (cycle courant). */
  endDate: ISODateString;
  /** Seuil 'attention' en pourcentage (défaut 75). */
  warningThreshold: number;
  /** Seuil 'alerte' en pourcentage (défaut 90). */
  alertThreshold: number;
  /** Seuil 'dépassé' en pourcentage (défaut 100). */
  overThreshold: number;
  /** True si archivé. */
  isArchived: boolean;
}

export interface BudgetPeriodStatus {
  budget: Budget;
  spentMinor: MoneyMinor;
  remainingMinor: MoneyMinor;
  progressPercent: number;
  status: BudgetStatus;
}

// ─── Goal ─────────────────────────────────────────────────────────────────────
export interface Goal extends SyncableFields {
  name: string;
  icon: string;
  color: string;
  /** Montant cible en unités mineures. */
  targetAmountMinor: MoneyMinor;
  /** Montant déjà économisé en unités mineures. */
  currentAmountMinor: MoneyMinor;
  currencyCode: CurrencyCode;
  /** Date cible (échéance). */
  targetDate: ISODateString | null;
  /** Compte associé (optionnel). */
  linkedAccountId: UUID | null;
  /** True si atteint. */
  isAchieved: boolean;
  /** True si archivé. */
  isArchived: boolean;
}

export interface GoalStatus {
  goal: Goal;
  progressPercent: number;
  remainingMinor: MoneyMinor;
  monthlySavingsNeeded: number;
  monthsRemaining: number;
}

// ─── Recurring Transaction ────────────────────────────────────────────────────
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringTransaction extends SyncableFields {
  type: TransactionType;
  accountId: UUID;
  categoryId: UUID | null;
  amountMinor: MoneyMinor;
  currencyCode: CurrencyCode;
  description: string;
  frequency: RecurringFrequency;
  startDate: ISODateString;
  endDate: ISODateString | null;
  /** Jour du mois pour 'monthly' (1-31), jour de semaine pour 'weekly' (0-6). */
  dayOfMonth?: number;
  /** Compte les occurrences déjà générées. */
  occurrencesGenerated: number;
  /** Date de la prochaine occurrence à générer. */
  nextOccurrence: ISODateString | null;
  isArchived: boolean;
}

// ─── Receipt ──────────────────────────────────────────────────────────────────
export type ReceiptStorageMode = 'local' | 'cloud' | 'hybrid';

export interface Receipt extends SyncableFields {
  transactionId: UUID | null;
  /** Chemin local du fichier image (FileSystem). */
  filePath: string;
  /** URL distante dans Supabase Storage (si storageMode = cloud | hybrid). */
  cloudUrl?: string | null;
  /** Chemin dans le bucket Supabase (ex. `user-uuid/receipt-uuid.jpg`). */
  cloudBucketPath?: string | null;
  /** Date de dernière sync cloud. */
  cloudSyncedAt?: ISODateString | null;
  /** Mode de stockage : local uniquement / cloud uniquement / hybride (local + cloud). */
  storageMode: ReceiptStorageMode;
  /** Nom de fichier d'origine. */
  originalFileName?: string;
  /** MIME type. */
  mimeType: string;
  /** Taille en octets. */
  sizeBytes: number;
  /** True si OCR déjà extrait. */
  ocrProcessed: boolean;
  /** Données OCR brutes (JSON). */
  ocrData?: string;
}

// ─── Settings (utilisateur local) ──────────────────────────────────────────────
export interface UserSettings {
  /** Devise principale (toutes les agrégations sont converties vers elle). */
  baseCurrency: CurrencyCode;
  /** Langue UI : 'fr' | 'en'. */
  language: 'fr' | 'en';
  /** Préférence de thème. */
  themePreference: 'light' | 'dark' | 'system';
  /** Mode démo activé. */
  isDemoMode: boolean;
  /** Sécurité. */
  security: SecuritySettings;
  /** Notifications. */
  notifications: NotificationSettings;
  /** Première utilisation. */
  isOnboardingComplete: boolean;
  /** Date de dernière synchro cloud (null si jamais). */
  lastSyncedAt: ISODateString | null;
}

export interface SecuritySettings {
  isPinEnabled: boolean;
  /** Hash du PIN (jamais en clair). */
  pinHash: string | null;
  isBiometricEnabled: boolean;
  autoLockDelaySeconds: number; // 0 | 60 | 300 | 900 | -1 (jamais)
}

export interface NotificationSettings {
  enableReminder: boolean;
  enableBudgetWarning: boolean;
  enableBudgetOver: boolean;
  enableRecurring: boolean;
  enableGoalUpdates: boolean;
  enableWeeklySummary: boolean;
  reminderHour: number; // 0-23
}

// ─── États UI ────────────────────────────────────────────────────────────────
export type ScreenState<T> =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string; retry?: () => void }
  | { kind: 'offline'; lastSyncedAt?: ISODateString }
  | { kind: 'success'; data: T };

// ─── Périodes d'analyse ──────────────────────────────────────────────────────
export type AnalysisPeriod =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'custom';

export interface PeriodRange {
  start: ISODateString;
  end: ISODateString;
}

// ─── Erreurs métier ───────────────────────────────────────────────────────────
export type MoneyZenErrorCode =
  | 'INVALID_AMOUNT'
  | 'INVALID_CURRENCY'
  | 'ACCOUNT_NOT_FOUND'
  | 'CATEGORY_NOT_FOUND'
  | 'TRANSFER_SAME_ACCOUNT'
  | 'INVALID_DATE'
  | 'INVALID_EXCHANGE_RATE'
  | 'RECURRING_DUPLICATE'
  | 'DB_CONSTRAINT'
  | 'OFFLINE_NO_RATE'
  | 'PIN_ALREADY_SET'
  | 'PIN_INVALID'
  | 'PIN_NOT_SET'
  | 'BIOMETRIC_UNAVAILABLE'
  | 'EXPORT_FAILED'
  | 'SYNC_CONFLICT'
  | 'UNKNOWN';

export class MoneyZenError extends Error {
  constructor(
    public code: MoneyZenErrorCode,
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'MoneyZenError';
  }
}
