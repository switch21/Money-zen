#!/usr/bin/env bash
# Money-zen — Setup & vérifications pré-lancement
#
# Usage :
#   ./setup.sh            # installe + typecheck + lint + tests
#   ./setup.sh --skip-tests # sans les tests
#   ./setup.sh --quick     # npm install uniquement
#   ./setup.sh --check     # typecheck + lint + tests sans réinstall
#
# Couleur + logs
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
err()   { echo -e "${RED}✗${NC} $1"; }
hr()    { echo -e "${BLUE}─────────────────────────────────────────────────────${NC}"; }

# Parse args
SKIP_TESTS=0
QUICK=0
CHECK_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=1 ;;
    --quick)      QUICK=1 ;;
    --check)      CHECK_ONLY=1 ;;
    *) ;;
  esac
done

hr
log "Money-zen — Setup & vérifications pré-lancement"
hr

# ─── Étape 1 : Vérifications environnement ─────────────────────────────────
log "Vérifications environnement…"

check_cmd() {
  if command -v "$1" >/dev/null 2>&1; then
    ok "$2 : $($1 --version 2>&1 | head -n1)"
    return 0
  else
    err "$2 introuvable. Installe-le avant de continuer."
    return 1
  fi
}

ENV_OK=1
check_cmd node "Node.js"     || ENV_OK=0
check_cmd npm  "npm"         || ENV_OK=0

if [ "$ENV_OK" -eq 0 ]; then
  err "Environnement incomplet. Abandon."
  exit 1
fi

# Vérifie la version de Node (≥ 18)
NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  err "Node.js $NODE_MAJOR détecté. Money-zen nécessite Node ≥ 18 (Expo 51)."
  exit 1
fi
ok "Version Node compatible (≥ 18)"

# ─── Étape 2 : Installation des dépendances ──────────────────────────────
if [ "$CHECK_ONLY" -eq 0 ]; then
  hr
  if [ -d "node_modules" ]; then
    warn "node_modules existe déjà. (Utilise --quick pour skip, ou supprime le dossier pour réinstaller.)"
  else
    log "Installation des dépendances (npm install)…"
    npm install --no-fund --no-audit
    ok "Dépendances installées"
  fi
fi

if [ "$QUICK" -eq 1 ]; then
  hr
  ok "Setup rapide terminé. Lance : npx expo start"
  exit 0
fi

# ─── Étape 3 : Typecheck ──────────────────────────────────────────────────
hr
log "TypeScript : typecheck strict (tsc --noEmit)…"
if npm run typecheck >/dev/null 2>&1; then
  ok "Typecheck : succès"
else
  warn "Typecheck : erreurs trouvées (ré-exécute `npm run typecheck` pour détails)"
  if [ "$CHECK_ONLY" -eq 0 ]; then
    npm run typecheck || true
  fi
fi

# ─── Étape 4 : ESLint ─────────────────────────────────────────────────────
hr
log "ESLint : vérification du code…"
if npm run lint >/dev/null 2>&1; then
  ok "ESLint : succès"
else
  warn "ESLint : warnings/errors trouvés (ré-exécute `npm run lint` pour détails)"
fi

# ─── Étape 5 : Tests unitaires ────────────────────────────────────────────
if [ "$SKIP_TESTS" -eq 0 ]; then
  hr
  log "Jest : tests unitaires…"
  if npm test --silent >/dev/null 2>&1; then
    ok "Tests : succès"
  else
    warn "Tests : certains échouent (ré-exécute `npm test` pour détails)"
  fi
else
  hr
  warn "Tests skipped (--skip-tests)"
fi

# ─── Étape 6 : Vérifications fichiers critiques ───────────────────────────
hr
log "Vérifications fichiers critiques…"
CRITICAL_FILES=(
  "package.json"
  "app.json"
  "babel.config.js"
  "metro.config.js"
  "tsconfig.json"
  ".env.example"
  "src/app/_layout.tsx"
  "src/database/sqlite.ts"
  "src/database/migrations/0001_initial.ts"
  "src/theme/tokens.ts"
  "src/i18n/fr.ts"
  "src/i18n/en.ts"
)

MISSING=0
for f in "${CRITICAL_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    err "Fichier manquant : $f"
    MISSING=1
  fi
done

if [ "$MISSING" -eq 0 ]; then
  ok "Tous les fichiers critiques présents"
else
  err "Fichiers critiques manquants — vérifie le zip."
  exit 1
fi

# ─── Étape 7 : .env optionnel ─────────────────────────────────────────────
hr
if [ ! -f ".env" ]; then
  warn ".env absent. Copie .env.example → .env si tu veux activer le mode démo ou configurer Supabase/OCR."
  echo -e "${BLUE}Commande :${NC} cp .env.example .env"
else
  ok ".env détecté"
fi

# ─── Récap final ───────────────────────────────────────────────────────────
hr
ok "Setup terminé. Prêt à lancer."
echo ""
echo -e "${BLUE}Prochaines étapes :${NC}"
echo -e "  1. ${GREEN}npx expo start${NC}              — lancer le bundler"
echo -e "  2. Installe ${BLUE}Expo Go${NC} sur ton téléphone (App Store / Play Store)"
echo -e "  3. Scanne le QR code affiché dans le terminal"
echo -e "  4. Pour iOS simulator : ${BLUE}npx expo start --ios${NC}"
echo -e "  5. Pour Android emulator : ${BLUE}npx expo start --android${NC}"
echo ""
echo -e "${BLUE}Mode démo :${NC} crée un .env avec EXPO_PUBLIC_DEMO_MODE=true pour seed des données."
echo -e "${BLUE}Documentation :${NC} consulte README.md pour l'architecture et la roadmap."
echo ""
hr
