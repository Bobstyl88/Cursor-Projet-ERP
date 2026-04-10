#!/usr/bin/env bash
set -e

# ============================================================================
# ERP SaaS — Démarrage Backend + Frontend
# Usage: bash scripts/start.sh
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/apps/backend"
FRONTEND_DIR="$ROOT_DIR/apps/frontend"

cleanup() {
  echo ""
  echo -e "${YELLOW}Arrêt des serveurs...${NC}"
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  echo -e "${GREEN}Serveurs arrêtés.${NC}"
}
trap cleanup EXIT INT TERM

# ── Vérification ────────────────────────────────────────────────────────────

if [ ! -f "$BACKEND_DIR/dist/main.js" ]; then
  echo -e "${RED}Backend non compilé. Lancez d'abord :${NC}"
  echo -e "  ${YELLOW}bash scripts/setup.sh${NC}"
  exit 1
fi

if [ ! -d "$ROOT_DIR/node_modules" ]; then
  echo -e "${RED}Dépendances non installées. Lancez d'abord :${NC}"
  echo -e "  ${YELLOW}bash scripts/setup.sh${NC}"
  exit 1
fi

# ── Démarrage Backend ───────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            ERP SaaS — Démarrage                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}[ERP]${NC} Démarrage du backend sur le port 4000..."
cd "$BACKEND_DIR"
node dist/main.js &
BACKEND_PID=$!

# Attendre que le backend soit prêt
for i in $(seq 1 30); do
  if curl -sf http://localhost:4000/api/v1/auth/login -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test","password":"test","tenantSlug":"test"}' > /dev/null 2>&1 \
    || curl -sf http://localhost:4000/docs > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

if kill -0 $BACKEND_PID 2>/dev/null; then
  echo -e "${GREEN}  ✓${NC} Backend prêt sur http://localhost:4000"
  echo -e "${GREEN}  ✓${NC} Swagger docs : http://localhost:4000/docs"
else
  echo -e "${RED}  ✗ Le backend n'a pas démarré${NC}"
  exit 1
fi

# ── Démarrage Frontend ──────────────────────────────────────────────────────

echo -e "${BLUE}[ERP]${NC} Démarrage du frontend sur le port 3000..."
cd "$FRONTEND_DIR"
npx next dev --port 3000 &
FRONTEND_PID=$!

# Attendre que le frontend soit prêt
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo -e "${GREEN}  ✓${NC} Frontend prêt sur http://localhost:3000"

# ── Info ────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Tout est prêt !${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BLUE}Frontend  :${NC} ${GREEN}http://localhost:3000${NC}"
echo -e "  ${BLUE}API       :${NC} ${GREEN}http://localhost:4000/api/v1${NC}"
echo -e "  ${BLUE}Swagger   :${NC} ${GREEN}http://localhost:4000/docs${NC}"
echo ""
echo -e "  ${BLUE}Connexion :${NC}"
echo -e "    Company ID : ${GREEN}demo${NC}"
echo -e "    Email      : ${GREEN}admin@demo.com${NC}"
echo -e "    Password   : ${GREEN}admin12345${NC}"
echo ""
echo -e "  ${YELLOW}Ctrl+C pour arrêter les serveurs${NC}"
echo ""

# Garder le script actif
wait
