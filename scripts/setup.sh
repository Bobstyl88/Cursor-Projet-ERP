#!/usr/bin/env bash
set -e

# ============================================================================
# ERP SaaS — Installation & Démarrage automatique
# Usage: bash scripts/setup.sh
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/apps/backend"
FRONTEND_DIR="$ROOT_DIR/apps/frontend"

log()   { echo -e "${BLUE}[ERP]${NC} $1"; }
ok()    { echo -e "${GREEN}  ✓${NC} $1"; }
warn()  { echo -e "${YELLOW}  ⚠${NC} $1"; }
fail()  { echo -e "${RED}  ✗${NC} $1"; exit 1; }

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        ERP SaaS — Installation automatique          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Vérification des prérequis ──────────────────────────────────────────────

log "Vérification des prérequis..."

node --version > /dev/null 2>&1 || fail "Node.js non trouvé. Installez Node.js 20+ : https://nodejs.org"
NODE_V=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_V" -lt 20 ]; then
  fail "Node.js 20+ requis (version actuelle: $(node --version))"
fi
ok "Node.js $(node --version)"

# ── PostgreSQL ──────────────────────────────────────────────────────────────

PG_RUNNING=false

if command -v pg_isready > /dev/null 2>&1 && pg_isready -q 2>/dev/null; then
  PG_RUNNING=true
  ok "PostgreSQL local détecté"
elif command -v docker > /dev/null 2>&1; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q postgres; then
    PG_RUNNING=true
    ok "PostgreSQL Docker détecté"
  else
    log "Démarrage de PostgreSQL via Docker..."
    docker compose -f "$ROOT_DIR/docker-compose.yml" up postgres -d --wait 2>/dev/null \
      || docker-compose -f "$ROOT_DIR/docker-compose.yml" up postgres -d 2>/dev/null \
      || fail "Impossible de démarrer PostgreSQL. Installez Docker ou PostgreSQL."
    sleep 3
    PG_RUNNING=true
    ok "PostgreSQL démarré via Docker"
  fi
fi

if [ "$PG_RUNNING" = false ]; then
  # Tenter d'installer PostgreSQL (Linux uniquement)
  if command -v apt-get > /dev/null 2>&1; then
    log "Installation de PostgreSQL..."
    sudo apt-get update -qq && sudo apt-get install -y -qq postgresql postgresql-client > /dev/null 2>&1
    sudo pg_ctlcluster 16 main start 2>/dev/null || sudo pg_ctlcluster 14 main start 2>/dev/null || true
    sleep 2
    if pg_isready -q 2>/dev/null; then
      PG_RUNNING=true
      ok "PostgreSQL installé et démarré"
    fi
  fi
fi

if [ "$PG_RUNNING" = false ]; then
  fail "PostgreSQL non disponible. Options :\n  1. Installez PostgreSQL : https://www.postgresql.org/download/\n  2. Installez Docker : https://docs.docker.com/get-docker/\n  3. Lancez : docker compose up postgres -d"
fi

# ── Création de la base de données ──────────────────────────────────────────

log "Configuration de la base de données..."

create_db() {
  if command -v psql > /dev/null 2>&1; then
    # Local PostgreSQL
    if sudo -u postgres psql -lqt 2>/dev/null | grep -qw erp_saas; then
      ok "Base erp_saas existe déjà"
    else
      sudo -u postgres psql -c "CREATE USER erp WITH PASSWORD 'erp_password' CREATEDB;" 2>/dev/null || true
      sudo -u postgres psql -c "CREATE DATABASE erp_saas OWNER erp;" 2>/dev/null || true
      ok "Base erp_saas créée"
    fi
  elif command -v docker > /dev/null 2>&1; then
    # Docker PostgreSQL — la base est créée par le docker-compose
    ok "Base gérée par Docker"
  fi
}
create_db

# ── Redis (optionnel) ───────────────────────────────────────────────────────

if command -v redis-cli > /dev/null 2>&1 && redis-cli ping > /dev/null 2>&1; then
  ok "Redis disponible"
elif command -v docker > /dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -q redis; then
  ok "Redis Docker disponible"
else
  warn "Redis non disponible (optionnel, l'app fonctionne sans)"
fi

# ── Installation des dépendances ────────────────────────────────────────────

log "Installation des dépendances npm..."
cd "$ROOT_DIR"
npm install --silent 2>&1 | tail -3
ok "Dépendances installées"

# ── Configuration du backend ────────────────────────────────────────────────

log "Configuration du backend..."
cd "$BACKEND_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
  ok "Fichier .env créé"
else
  ok "Fichier .env existe déjà"
fi

# ── Prisma : generate + migrate + seed ──────────────────────────────────────

log "Initialisation de la base de données..."
npx prisma generate --schema=prisma/schema.prisma > /dev/null 2>&1
ok "Prisma Client généré"

npx prisma migrate dev --name init --skip-generate 2>/dev/null \
  || npx prisma migrate deploy 2>/dev/null \
  || warn "Migration déjà appliquée"
ok "Migrations appliquées"

# Seed only if the demo tenant doesn't exist yet
SEED_NEEDED=$(npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.tenant.findUnique({where:{slug:'demo'}}).then(t => {
  console.log(t ? 'no' : 'yes');
  p.\$disconnect();
}).catch(() => { console.log('yes'); p.\$disconnect(); });
" 2>/dev/null || echo "yes")

if [ "$SEED_NEEDED" = "yes" ]; then
  npx ts-node prisma/seed.ts 2>/dev/null
  ok "Données de démo créées"
else
  ok "Données de démo déjà présentes"
fi

# ── Compilation du backend ──────────────────────────────────────────────────

log "Compilation du backend..."
rm -rf dist tsconfig.tsbuildinfo
npx tsc -p tsconfig.json
ok "Backend compilé"

# ── Démarrage ───────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Installation terminée !                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}Identifiants de démo :${NC}"
echo -e "    Company ID : ${GREEN}demo${NC}"
echo -e "    Email      : ${GREEN}admin@demo.com${NC}"
echo -e "    Password   : ${GREEN}admin12345${NC}"
echo ""
echo -e "  ${BLUE}Démarrage :${NC}"
echo -e "    Terminal 1 : ${YELLOW}cd apps/backend && node dist/main.js${NC}"
echo -e "    Terminal 2 : ${YELLOW}cd apps/frontend && npm run dev${NC}"
echo ""
echo -e "  ${BLUE}URLs :${NC}"
echo -e "    Frontend   : ${GREEN}http://localhost:3000${NC}"
echo -e "    API Swagger: ${GREEN}http://localhost:4000/docs${NC}"
echo ""
echo -e "  ${BLUE}Ou lancez tout d'un coup :${NC}"
echo -e "    ${YELLOW}bash scripts/start.sh${NC}"
echo ""
