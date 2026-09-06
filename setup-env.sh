#!/usr/bin/env bash
# Money-zen — Setup .env interactif (SÉCURISÉ)
#
# Usage :
#   ./setup-env.sh
#
# Ce script :
#   - Ne lit JAMAIS vos valeurs à l'écran (mode silencieux)
#   - Écrit dans .env directement
#   - Permet de skipper n'importe quelle variable avec Entrée
#   - Affiche un récap masqué (xxxx-xxxx-xxxx) à la fin

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

if [ ! -f "$ENV_EXAMPLE" ]; then
  echo -e "${RED}Erreur : .env.example introuvable. Lancez ce script depuis la racine du projet.${NC}"
  exit 1
fi

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Money-zen — Configuration du fichier .env                       ║${NC}"
echo -e "${BLUE}║   Vos valeurs ne seront JAMAIS affichées à l'écran.               ║${NC}"
echo -e "${BLUE}║   Appuyez sur Entrée pour skipper une variable.                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Backup si .env existe déjà
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
  echo -e "${YELLOW}⚠  .env existant sauvegardé en .env.backup.*${NC}"
  echo ""
fi

# Lecture silencieuse d'une valeur
# Args: prompt, var_name, is_secret(0|1)
read_value() {
  local prompt="$1"
  local var_name="$2"
  local is_secret="${3:-1}"
  local value=""

  echo -e "${BLUE}${prompt}${NC}"
  if [ "$is_secret" = "1" ]; then
    # Lecture silencieuse (sans echo)
    read -s value
    echo ""  # newline après read -s
  else
    read value
  fi
  echo "$value"
}

# Collecte des valeurs dans un fichier temporaire
TMP_FILE=$(mktemp)
trap "rm -f $TMP_FILE" EXIT

echo -e "${BLUE}─── 1. SUPABASE (PRIORITÉ HAUTE) ──────────────────────────────${NC}"
echo ""
echo -e "${YELLOW}Obtenez ces valeurs sur : https://supabase.com → Dashboard → Project Settings → API${NC}"
echo ""

SUPABASE_URL=$(read_value "SUPABASE_URL (ex: https://xxxxx.supabase.co) :" 1 0)
SUPABASE_ANON_KEY=$(read_value "SUPABASE_ANON_KEY (clé 'anon public') :" 1 1)

cat >> "$TMP_FILE" <<EOF
# ═══════════════════════════════════════════════════════════════════════════
# 1. SUPABASE — BACKEND CLOUD
# ═══════════════════════════════════════════════════════════════════════════
EXPO_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
EXPO_PUBLIC_SYNC_STRATEGY=auto
EXPO_PUBLIC_RECEIPT_STORAGE_MODE=hybrid

EOF

echo ""
echo -e "${BLUE}─── 2. OCR.space — 4 CLÉS POUR FAILOVER ───────────────────────${NC}"
echo ""
echo -e "${YELLOW}Créez 4 comptes sur https://ocr.space/ocrapi (gratuit, pas de CB).${NC}"
echo -e "${YELLOW}Chaque compte → 25 000 scans/mois. Total = 100 000/mois gratuits.${NC}"
echo ""

OCR_KEY_1=$(read_value "OCR.space API Key #1 :" 1 1)
OCR_KEY_2=$(read_value "OCR.space API Key #2 (Entrée pour skip) :" 1 1)
OCR_KEY_3=$(read_value "OCR.space API Key #3 (Entrée pour skip) :" 1 1)
OCR_KEY_4=$(read_value "OCR.space API Key #4 (Entrée pour skip) :" 1 1)

cat >> "$TMP_FILE" <<EOF
# ═══════════════════════════════════════════════════════════════════════════
# 2. OCR.space — 4 CLÉS API POUR FAILOVER
# ═══════════════════════════════════════════════════════════════════════════
EXPO_PUBLIC_OCR_API_KEY_1=${OCR_KEY_1}
EXPO_PUBLIC_OCR_API_KEY_2=${OCR_KEY_2}
EXPO_PUBLIC_OCR_API_KEY_3=${OCR_KEY_3}
EXPO_PUBLIC_OCR_API_KEY_4=${OCR_KEY_4}
EXPO_PUBLIC_OCR_PROVIDER=ocrspace
EXPO_PUBLIC_OCR_USER_MONTHLY_LIMIT=10

EOF

echo ""
echo -e "${BLUE}─── 3. TAUX DE CHANGE ────────────────────────────────────────${NC}"
echo ""
echo -e "${YELLOW}Frankfurter est gratuit sans clé (défaut). Appuyez sur Entrée pour garder les valeurs par défaut.${NC}"
echo ""

EXCHANGE_PROVIDER=$(read_value "Provider (frankfurter|openexchangerates|exchangerate.host) [frankfurter] :" 1 0)
EXCHANGE_PROVIDER=${EXCHANGE_PROVIDER:-frankfurter}

EXCHANGE_API_KEY=""
if [ "$EXCHANGE_PROVIDER" != "frankfurter" ]; then
  EXCHANGE_API_KEY=$(read_value "Clé API pour $EXCHANGE_PROVIDER :" 1 1)
fi

cat >> "$TMP_FILE" <<EOF
# ═══════════════════════════════════════════════════════════════════════════
# 3. TAUX DE CHANGE
# ═══════════════════════════════════════════════════════════════════════════
EXPO_PUBLIC_EXCHANGE_RATE_PROVIDER=${EXCHANGE_PROVIDER}
EXPO_PUBLIC_EXCHANGE_RATE_API_KEY=${EXCHANGE_API_KEY}

EOF

echo ""
echo -e "${BLUE}─── 4. MODE DÉMO (optionnel) ───────────────────────────────────${NC}"
echo ""

DEMO_MODE=$(read_value "Activer le mode démo ? (true/false) [false] :" 1 0)
DEMO_MODE=${DEMO_MODE:-false}

cat >> "$TMP_FILE" <<EOF
# ═══════════════════════════════════════════════════════════════════════════
# 6. MODE DÉMO
# ═══════════════════════════════════════════════════════════════════════════
EXPO_PUBLIC_DEMO_MODE=${DEMO_MODE}

# Variables futures (laisser vide) :
EXPO_PUBLIC_FINANCIAL_INSIGHTS_API_KEY=
EXPO_PUBLIC_ANALYTICS_ENABLED=false
EXPO_PUBLIC_ANALYTICS_API_KEY=
EOF

# Écrit le fichier .env
mv "$TMP_FILE" "$ENV_FILE"
chmod 600 "$ENV_FILE"  # permissions restrictives

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}✓ Fichier .env créé avec succès.${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Récap masqué
echo -e "${BLUE}Récap (valeurs masquées) :${NC}"
mask() {
  local v="$1"
  if [ -z "$v" ]; then
    echo "(vide)"
  elif [ ${#v} -le 8 ]; then
    echo "****"
  else
    echo "${v:0:4}...${v: -4}"
  fi
}

echo "  SUPABASE_URL              : $(mask "$SUPABASE_URL")"
echo "  SUPABASE_ANON_KEY         : $(mask "$SUPABASE_ANON_KEY")"
echo "  OCR_KEY_1                 : $(mask "$OCR_KEY_1")"
echo "  OCR_KEY_2                 : $(mask "$OCR_KEY_2")"
echo "  OCR_KEY_3                 : $(mask "$OCR_KEY_3")"
echo "  OCR_KEY_4                 : $(mask "$OCR_KEY_4")"
echo "  EXCHANGE_PROVIDER         : $EXCHANGE_PROVIDER"
echo "  DEMO_MODE                 : $DEMO_MODE"
echo ""

# Vérifie qu'au moins Supabase est configuré
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo -e "${YELLOW}⚠  Supabase URL/KEY vides → cloud sync désactivé.${NC}"
  echo -e "${YELLOW}   Money-zen fonctionnera en local uniquement (offline-first).${NC}"
  echo ""
fi

# Vérifie qu'au moins une clé OCR est présente
OCR_COUNT=0
[ -n "$OCR_KEY_1" ] && OCR_COUNT=$((OCR_COUNT+1))
[ -n "$OCR_KEY_2" ] && OCR_COUNT=$((OCR_COUNT+1))
[ -n "$OCR_KEY_3" ] && OCR_COUNT=$((OCR_COUNT+1))
[ -n "$OCR_KEY_4" ] && OCR_COUNT=$((OCR_COUNT+1))

echo -e "${BLUE}OCR : $OCR_COUNT clé(s) configurée(s) → ${OCR_COUNT} × 25 000 = $((OCR_COUNT * 25000)) scans/mois gratuits${NC}"
echo ""

echo -e "${GREEN}Prochaines étapes :${NC}"
echo -e "  1. ${BLUE}./setup.sh${NC}            — installer + typecheck + lint + tests"
echo -e "  2. ${BLUE}npx expo start${NC}        — lancer l'app"
echo -e "  3. Sur Supabase : copiez ${YELLOW}supabase_schema.sql${NC} dans SQL Editor et exécutez"
echo -e ""
echo -e "${YELLOW}⚠  .env ne doit JAMAIS être commité dans Git.${NC}"
echo -e "${YELLOW}   Vérifiez que .gitignore contient bien '.env'.${NC}"
