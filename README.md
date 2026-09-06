# Money-zen

> **Application mobile de gestion financière personnelle multidevise** — Simple. Intuitive. Hors ligne.

Money-zen est une application mobile Expo/React Native/TypeScript qui suit vos revenus, dépenses, transferts, budgets, objectifs d'épargne et patrimoine, avec un moteur multidevise natif et une architecture offline-first.

Spécification source : `Instructions_Money-zen.md` (76 sections, 17 phases).

---

## Démarrage rapide

```bash
# 1. Dézipper le projet
unzip money-zen.zip
cd money-zen

# 2. Configurer le .env (sécurisé — pas de valeurs dans le chat)
./setup-env.sh
# OU : cp .env.example .env puis éditer manuellement

# 3. Installer + vérifier (typecheck + lint + tests)
./setup.sh

# 4. Lancer le serveur Expo
npx expo start

# 5. Sur Supabase (optionnel, pour cloud sync) :
#    - Copier supabase_schema.sql dans SQL Editor → Run
#    - Voir "Brancher Supabase" ci-dessous
```

## Pré-requis

- **Node.js** ≥ 18
- **npm** ≥ 9 (ou pnpm/yarn)
- **Expo CLI** : `npm install -g expo-cli`
- Pour iOS : Xcode + CocoaPods
- Pour Android : Android Studio + SDK
- **Compte Supabase** (gratuit, optionnel — pour cloud sync)
- **Compte(s) OCR.space** (gratuit, optionnel — pour scan de reçus)

## Variables d'environnement

### Configuration minimale (app fonctionne en local-only)

| Variable | Rôle | Obligatoire |
|---|---|---|
| `EXPO_PUBLIC_DEMO_MODE` | `true` active les données démo | Non |

### Configuration complète (cloud + OCR)

| Variable | Rôle | Source |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Backend cloud (URL publique) | supabase.com → Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Backend cloud (clé publique) | supabase.com → Project Settings → API |
| `EXPO_PUBLIC_SYNC_STRATEGY` | `auto` / `manual` / `disabled` | Non (defaut: auto) |
| `EXPO_PUBLIC_RECEIPT_STORAGE_MODE` | `local` / `cloud` / `hybrid` | Non (defaut: local) |
| `EXPO_PUBLIC_OCR_API_KEY_1` | Clé OCR.space #1 (25k scans/mois) | ocr.space → Sign up |
| `EXPO_PUBLIC_OCR_API_KEY_2` | Clé OCR.space #2 (25k scans/mois) | ocr.space (compte #2) |
| `EXPO_PUBLIC_OCR_API_KEY_3` | Clé OCR.space #3 (25k scans/mois) | ocr.space (compte #3) |
| `EXPO_PUBLIC_OCR_API_KEY_4` | Clé OCR.space #4 (25k scans/mois) | ocr.space (compte #4) |
| `EXPO_PUBLIC_OCR_USER_MONTHLY_LIMIT` | Limite anti-abus par user (defaut: 10) | Non |
| `EXPO_PUBLIC_EXCHANGE_RATE_PROVIDER` | `frankfurter` (gratuit) / `openexchangerates` / `exchangerate.host` | Non |
| `EXPO_PUBLIC_EXCHANGE_RATE_API_KEY` | Clé API si provider != frankfurter | Non |
| `EXPO_PUBLIC_DEMO_MODE` | `true` active les données démo au prochain lancement | Non |

### Setup sécurisé des variables

⚠️ **NE JAMAIS coller vos clés API dans un chat ou un outil externe.**

Utilisez `./setup-env.sh` : il demande chaque valeur en mode silencieux (lecture masquée), écrit dans `.env` avec permissions restrictives (600), et affiche un récap masqué (xxxx...xxxx) à la fin.

## Brancher Supabase — Guide pas à pas

### Étape 1 : Créer le projet Supabase (5 minutes)

1. Aller sur **https://supabase.com** → Sign up (gratuit)
2. New Project :
   - **Name** : `money-zen`
   - **Database Password** : choisissez un mot de passe fort (sauvegardez-le !)
   - **Region** : `eu-central-1` (Francfort) — le + proche d'Afrique de l'Ouest avec faible latence
3. Attendre 2-3 minutes que le projet s'initialise

### Étape 2 : Récupérer les credentials

1. Dashboard → **Project Settings** (icône engrenage)
2. **API** :
   - Copier `Project URL` → c'est `EXPO_PUBLIC_SUPABASE_URL`
   - Copier `anon public` key → c'est `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Étape 3 : Exécuter le schéma SQL

1. Dashboard → **SQL Editor** (icône à gauche)
2. New query
3. Copiez-collez le contenu de `supabase_schema.sql` (à la racine du projet)
4. **Run**
5. Vérifier que toutes les tables sont créées : `select tablename from pg_tables where schemaname = 'public';`

### Étape 4 : Configurer le .env

```bash
./setup-env.sh
# OU
cp .env.example .env
# Éditez .env avec vos valeurs Supabase
```

### Étape 5 : Lancer l'app

```bash
npx expo start
```

L'app détecte automatiquement Supabase (URL + anon key renseignées) et active :
- Auth (login/register)
- Sync cloud (push + pull + conflict resolution)
- Storage pour les reçus (si mode hybride activé)

## Configuration OCR.space (4 clés failover)

### Pourquoi 4 clés ?

OCR.space offre **25 000 scans/mois gratuits** par compte API. Avec 4 comptes :
- 4 × 25 000 = **100 000 scans/mois gratuits**
- Failover automatique (si clé #1 épuisée → clé #2, etc.)
- Reset mensuel automatique (1er du mois)

### Création des 4 comptes

1. Aller sur **https://ocr.space/ocrapi** → Sign up (gratuit, pas de CB)
2. Récupérer l'API Key dans le dashboard
3. Répéter 3 fois avec 3 emails différents (comptes #2, #3, #4)
4. Lancer `./setup-env.sh` et coller chaque clé quand demandé

### Stratégie anti-abus

- **Limite utilisateur** : `EXPO_PUBLIC_OCR_USER_MONTHLY_LIMIT=10` (défaut)
- Au-delà de 10 scans/user/mois → message "Premium requis"
- Audit trail dans la table `ocr_usage` (migration 0002)
- État des clés persisté dans SecureStore (exhaustedAt, monthlyUsage)

### ⚠️ Risque sécurité (V1)

Les 4 clés sont embarquées dans le bundle JS Expo (`EXPO_PUBLIC_*`). Un attaquant motivé peut :
- Décompiler l'APK
- Extraire les 4 clés
- Les utiliser pour son propre bénéfice

**Mitigation V1** :
- Limite à 10 scans/user/mois côté app
- Surveillance des dashboards OCR.space
- Régénération des clés tous les 3-6 mois

**Mitigation définitive (V2+)** :
- Déplacer les 4 clés dans une **Supabase Edge Function**
- L'app POST l'image → Supabase choisit la clé → renvoie le résultat
- Les clés ne sont jamais dans le bundle

## Architecture hybride de stockage des reçus

3 modes configurables via `EXPO_PUBLIC_RECEIPT_STORAGE_MODE` ou dans Settings :

| Mode | Local | Cloud | Multi-device | Offline | Coût |
|---|---|---|---|---|---|
| `local` (defaut) | ✅ | ❌ | ❌ | ✅ | 0€ |
| `cloud` | ❌ (après upload) | ✅ | ✅ | ⚠️ (limité au cache) | Supabase Storage |
| `hybrid` (recommandé) | ✅ | ✅ | ✅ | ✅ | Supabase Storage |

Voir `src/services/storage/receiptStorageService.ts` pour l'implémentation.

## Scripts disponibles

```bash
npm start          # Démarre le bundler Expo
npm run typecheck  # TypeScript strict (no-emit)
npm run lint       # ESLint
npm run lint:fix   # ESLint fix
npm run format     # Prettier
npm test           # Jest (tests unitaires + intégration)
```

## Architecture

Money-zen suit une Clean Architecture en couches (spec section 6) :

```
UI (Screens)
  ↓
Components / Hooks
  ↓
Application Services (ExchangeRateService, SecurityService, etc.)
  ↓
Domain (types purs, règles métier)
  ↓
Repositories (SQLite)
  ↓
SQLite (Expo SQLite)
  ↓ (future)
Sync Engine → Supabase
```

### Structure des dossiers

```
src/
├── app/                      # Expo Router (routes)
│   ├── (tabs)/                # 5 onglets principaux : Home, Transactions, Comptes, Analytics, Settings
│   ├── onboarding/            # Welcome, Currency, Account, Security, PIN setup
│   ├── transaction/           # new, [id] (détail)
│   ├── account/               # new, [id]
│   ├── transfer/              # new
│   ├── budget/                # new
│   ├── goal/                  # new
│   └── settings/              # currencies, export
├── components/
│   └── common/                # Text, Button, Card, Input, AmountInput, CurrencySelector,
│                              # Badge, ProgressBar, ConfirmDialog, BottomSheet, States, Specialized
├── domain/                    # (Règles métier)
├── database/
│   ├── migrations/            # 0001_initial.ts (schéma complet)
│   ├── repositories/          # SQLite data access : Account, Transaction, Category, Currency,
│   │                          # ExchangeRate, Budget, Goal, Recurring, Receipt, Transfer, Settings
│   └── sqlite.ts              # Singleton SQLite connection
├── services/
│   ├── exchangeRates/         # ExchangeRateService (cache + fallback offline)
│   ├── security/              # SecurityService (PIN hashé, biométrie, auto-lock)
│   ├── notifications/         # NotificationService (rappels, budgets, récurrences)
│   ├── export/                # ExportService (CSV, PDF)
│   ├── sync/                  # SyncService (Supabase, no-op en V1)
│   ├── ocr/                   # ReceiptScannerService (stub, V2)
│   └── insights/              # FinancialInsightsService (rule-based en V1)
├── stores/
│   ├── appStore.ts            # État global (isDbReady, isOnline, isLocked)
│   ├── settingsStore.ts       # Cache des préférences (baseCurrency, language, theme, etc.)
│   └── uiStore.ts             # État UI transitoire (filtres, modales)
├── hooks/                     # useDashboard (aggrégation), autres hooks
├── utils/                     # money (montants sûrs), uuid, date
├── constants/                 # currencies, categories, global
├── types/                     # Tous les types TypeScript (entités, settings, errors)
├── theme/                     # Tokens design + ThemeProvider (clair/sombre/système)
└── i18n/                      # FR + EN
```

## Phase par phase (status)

| Phase | Contenu | Statut |
|---|---|---|
| **0** | Fondations : Expo, TS, Router, ESLint, Prettier, structure, thème, SQLite, migrations | ✅ |
| **1** | Design System : ThemeProvider, tokens, Text, Button, Card, Input, AmountInput, CurrencySelector, Badge, ProgressBar, ConfirmDialog, BottomSheet, States | ✅ |
| **2** | SQLite : 10 repositories + migrations + helpers + démo data | ✅ |
| **3** | Comptes : création, modification, archivage, détail, solde recalculé, Mobile Money | ✅ |
| **4** | Transactions : dépense, revenu, modification, suppression, recherche, filtres, historique | ✅ |
| **5** | Transferts : source/destination, même devise, multidevise, frais | ✅ |
| **6** | Moteur multidevise : ExchangeRateService (cache + fallback offline) | ✅ |
| **7** | Dashboard : patrimoine, revenus, dépenses, solde net, catégories, budgets, objectif, dernières opérations | ✅ |
| **8** | Budgets : création, progression, alertes, dépassement, seuils configurables | ✅ |
| **9** | Récurrences : repository + computeNextOccurrence + listDueRecurringTransactions (scheduler à brancher en Phase 12) | ✅ (repository) |
| **10** | Objectifs : création, progression, calcul épargne mensuelle nécessaire | ✅ |
| **11** | Sécurité : SecurityService (PIN SHA-256, biométrie, auto-lock) | ✅ |
| **12** | Notifications : NotificationService (rappels, budgets, récurrences, objectifs, résumé) | ✅ (configurable) |
| **13** | Reçus : receiptRepository (CRUD, attach, OCR-stub) | ✅ (architecture) |
| **14** | Export : ExportService (CSV + PDF via expo-print) | ✅ |
| **15** | Cloud : SyncService (architecture Supabase, no-op en V1) | ✅ (architecture) |
| **16** | Premium / publicité : architecture de monétisation (placeholder, à brancher) | 🚧 |
| **17** | OCR / IA : ReceiptScannerService + FinancialInsightsService (stub V2) | ✅ (architecture) |

## Règles métier critiques (spec section 49)

| # | Règle | Implémentation |
|---|---|---|
| 1 | Dépense réduit le solde | `recalculateBalance()` dans transactionRepository |
| 2 | Revenu augmente le solde | idem |
| 3 | Transfert ≠ revenu/dépense | type distinct + table `transaction_transfers` séparée |
| 4 | Conversion conserve le taux historique | `exchangeRate` + `exchangeRateDate` figés sur chaque transaction |
| 5 | Patrimoine = Σ soldes convertis en devise principale | `useDashboard` hook |
| 6 | Budget ne comptabilise que les dépenses de sa période/catégorie | `getBudgetStatus` filtre par date + catégorie |
| 7 | Transferts non inclus dans les dépenses | `aggregateTransactionsForPeriod` filtre `type IN ('income', 'expense')` |
| 8 | Anciennes transactions inchangées quand taux évoluent | Taux figés sur la row transaction |
| 9 | Montant > 0 obligatoire | `CHECK (amountMinor > 0)` SQL + validation TS |
| 10 | Cohérence après redémarrage | SQLite WAL + transactions atomiques |

## Tests

```bash
npm test
```

Les tests couvrent :
- `src/utils/money.test.ts` — moteur monétaire (toMinor, fromMinor, convertMinor, formatMoney)
- `src/domain/businessRules.test.ts` — squelette des tests de règles métier

## Sécurité

- **PIN** : hash SHA-256 + salt stocké dans Expo SecureStore (jamais en clair, jamais en SQLite)
- **Biométrie** : expo-local-authentication (Face ID / empreinte)
- **Auto-lock** : immédiat / 1m / 5m / 15m / jamais
- **Données sensibles** : SecureStore pour tokens, secret, etc.

## Performance

- `FlashList` (Shopify) pour les listes de transactions
- Pagination par défaut (50 items / page)
- Index SQLite sur `accountId`, `categoryId`, `date`, `type`, `nextOccurrence`
- `recalculateBalance` en transaction atomique

## Internationalisation

- **FR** (par défaut) — `src/i18n/fr.ts`
- **EN** — `src/i18n/en.ts`
- Toutes les clés sont préfixées par domaine (ex. `transaction.add`, `settings.security.pin`)
- Changer de langue : Paramètres → Langue

## Thèmes

- **Clair** (ivoire + terracotta) — palette éditoriale chaleureuse
- **Sombre** (charbon + terracotta claire)
- **Système** : suit la préférence du device
- Changer : Paramètres → Thème

## Données de démonstration

Le mode démo (toggle dans Paramètres → Données → Mode démo) seede :
- 4 comptes (Espèces, Banque, Orange Money, Épargne)
- 3 mois de transactions (salaire, loyer, dépenses diverses)
- 2 budgets (Alimentation, Transport)
- 1 objectif (Voiture)
- 2 récurrences (Salaire, Loyer)

Désactiver le mode démo efface toutes les données démo (reconnaissables par le suffixe `DEMO` dans les noms).

## Limitations connues (V1)

- **Pas de sync cloud** — V1 100% locale. La structure est préparée pour Supabase (Phase 15).
- **Pas d'OCR** — V1 ne scanne pas les reçus automatiquement (Phase 17). L'UI de capture photo et l'attachement à une transaction sont préparés.
- **Pas d'IA Insights** — Les insights sont rule-based (comparaison mois courant vs précédent, alertes budget). Un LLM peut être branché plus tard (Phase 17).
- **Pas de publicité / premium** — Architecture de monétisation préparée mais non branchée.

## Roadmap post-V1

- **Phase 15** : Brancher Supabase + auth + sync multi-device
- **Phase 16** : Abonnement Premium + publicité non-intrusive
- **Phase 17** : OCR (scan de reçus), catégorisation intelligente, assistant financier LLM
- **Open Banking** : intégration API bancaires réelles
- **Mobile Money** : intégration Orange Money / MTN MoMo APIs (si disponibles)

## Licence

Code source privé. Spécification : `Instructions_Money-zen.md`.

---

Conçu pour être **publié sur Android et iOS**, pas un prototype jetable. Suivre les règles section 76 :
> **simplicité > complexité** · **fiabilité > rapidité** · **architecture propre > hack temporaire** · **expérience utilisateur > quantité de fonctionnalités** · **offline-first > dépendance réseau** · **sécurité > commodité** · **données exactes > approximations** · **code maintenable > code simplement fonctionnel**
