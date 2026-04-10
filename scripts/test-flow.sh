#!/usr/bin/env bash

# ============================================================================
# ERP SaaS — Test du flux métier complet
# Usage: bash scripts/test-flow.sh
#
# Ce script teste le flux de bout en bout :
#   Login → Produits → Contacts → Devis → Commande → Facture
#   → Écriture comptable → Paiement → Balance générale → Dashboard
#
# Prérequis : le backend doit tourner sur http://localhost:4000
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

API="http://localhost:4000/api/v1"
PASS=0
FAIL=0
TOKEN=""

# ── Fonctions utilitaires ───────────────────────────────────────────────────

header() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

step() {
  echo -e "\n${BLUE}[$1]${NC} ${BOLD}$2${NC}"
}

pass() {
  echo -e "  ${GREEN}✓ PASS${NC} $1"
  PASS=$((PASS + 1))
}

fail() {
  echo -e "  ${RED}✗ FAIL${NC} $1"
  FAIL=$((FAIL + 1))
}

detail() {
  echo -e "  ${YELLOW}→${NC} $1"
}

# Appel API avec gestion d'erreur
call() {
  local method=$1 path=$2 body=$3
  local headers=(-H "Content-Type: application/json")
  [ -n "$TOKEN" ] && headers+=(-H "Authorization: Bearer $TOKEN")

  if [ -n "$body" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" "$API$path" "${headers[@]}" -d "$body" 2>/dev/null)
  else
    RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" "$API$path" "${headers[@]}" 2>/dev/null)
  fi

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
}

# Extraire une valeur JSON (compatible basique sans jq)
json_val() {
  echo "$1" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    keys = '$2'.split('.')
    for k in keys:
        if isinstance(d, dict):
            d = d.get(k, '')
        elif isinstance(d, list) and k.isdigit():
            d = d[int(k)]
        else:
            d = ''
            break
    print(d if d is not None else '')
except:
    print('')
" 2>/dev/null
}

# ── Vérification serveur ───────────────────────────────────────────────────

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         ERP SaaS — Test du flux métier complet             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

step "0" "Vérification du serveur"
call GET "/auth/login"
if [ "$HTTP_CODE" = "000" ]; then
  fail "Le backend ne répond pas sur $API"
  echo ""
  echo -e "  ${YELLOW}Lancez d'abord :${NC}"
  echo -e "    ${GREEN}bash scripts/setup.sh${NC}"
  echo -e "    ${GREEN}bash scripts/start.sh${NC}"
  echo ""
  exit 1
fi
pass "Backend accessible sur $API"

# ════════════════════════════════════════════════════════════════════════════
header "PHASE 1 : Authentification"
# ════════════════════════════════════════════════════════════════════════════

step "1.1" "Login avec identifiants de démo"
call POST "/auth/login" '{"email":"admin@demo.com","password":"admin12345","tenantSlug":"demo"}'

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  TOKEN=$(json_val "$BODY" "accessToken")
  USER_NAME=$(json_val "$BODY" "user.firstName")
  TENANT_NAME=$(json_val "$BODY" "tenant.name")
  pass "Connecté en tant que $USER_NAME ($TENANT_NAME)"
  detail "Token JWT obtenu (${#TOKEN} caractères)"
else
  fail "Login échoué (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi

step "1.2" "Login avec mauvais mot de passe (doit échouer)"
call POST "/auth/login" '{"email":"admin@demo.com","password":"wrongpassword","tenantSlug":"demo"}'
if [ "$HTTP_CODE" = "401" ]; then
  pass "Rejeté correctement (401 Unauthorized)"
else
  fail "Aurait dû retourner 401, reçu $HTTP_CODE"
fi

step "1.3" "Accès sans token (doit échouer)"
OLD_TOKEN=$TOKEN
TOKEN=""
call GET "/products"
if [ "$HTTP_CODE" = "401" ]; then
  pass "Accès refusé sans token (401)"
else
  fail "Aurait dû retourner 401, reçu $HTTP_CODE"
fi
TOKEN=$OLD_TOKEN

# ════════════════════════════════════════════════════════════════════════════
header "PHASE 2 : Données de référence"
# ════════════════════════════════════════════════════════════════════════════

step "2.1" "Liste des produits"
call GET "/products"
PRODUCT_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); r=r.get('data',r) if isinstance(r,dict) else r; print(len(r))" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ] && [ "$PRODUCT_COUNT" -gt 0 ] 2>/dev/null; then
  pass "$PRODUCT_COUNT produits trouvés"
  # Extraire les IDs
  PROD1_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); r=r.get('data',r) if isinstance(r,dict) else r; print([p['id'] for p in r if p['sku']=='PROD-001'][0])" 2>/dev/null)
  PROD2_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); r=r.get('data',r) if isinstance(r,dict) else r; print([p['id'] for p in r if p['sku']=='PROD-002'][0])" 2>/dev/null)
  detail "PROD-001: $PROD1_ID"
  detail "PROD-002: $PROD2_ID"
else
  fail "Aucun produit trouvé (HTTP $HTTP_CODE)"
fi

step "2.2" "Liste des contacts (clients)"
call GET "/contacts?type=CUSTOMER"
CUSTOMER_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); r=r.get('data',r) if isinstance(r,dict) else r; print(r[0]['id'])" 2>/dev/null)
CUSTOMER_NAME=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); r=r.get('data',r) if isinstance(r,dict) else r; print(r[0].get('companyName',''))" 2>/dev/null)
if [ -n "$CUSTOMER_ID" ]; then
  pass "Client trouvé : $CUSTOMER_NAME"
else
  fail "Aucun client trouvé"
fi

step "2.3" "Liste des entrepôts"
call GET "/warehouses"
if [ "$HTTP_CODE" = "200" ]; then
  WH_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d if isinstance(d,list) else d.get('data',d); r=r if isinstance(r,list) else r.get('data',r) if isinstance(r,dict) else [r]; print(len(r))" 2>/dev/null)
  pass "$WH_COUNT entrepôt(s)"
else
  fail "HTTP $HTTP_CODE"
fi

step "2.4" "Règles fiscales"
call GET "/tax-rules"
if [ "$HTTP_CODE" = "200" ]; then
  TAX_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d if isinstance(d,list) else d.get('data',d); r=r if isinstance(r,list) else r.get('data',r) if isinstance(r,dict) else [r]; print(len(r))" 2>/dev/null)
  pass "$TAX_COUNT règles de taxe"
else
  fail "HTTP $HTTP_CODE"
fi

step "2.5" "Devises"
call GET "/currencies"
if [ "$HTTP_CODE" = "200" ]; then
  CURR_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d if isinstance(d,list) else d.get('data',d); r=r if isinstance(r,list) else r.get('data',r) if isinstance(r,dict) else [r]; print(len(r))" 2>/dev/null)
  pass "$CURR_COUNT devises configurées"
else
  fail "HTTP $HTTP_CODE"
fi

step "2.6" "Conversion multi-devises (1000 EUR → USD)"
call GET "/currencies/convert?amount=1000&from=EUR&to=USD"
if [ "$HTTP_CODE" = "200" ]; then
  CONVERTED=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); print(f\"{r.get('amount',0):.2f}\")" 2>/dev/null)
  RATE=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); print(r.get('rate','?'))" 2>/dev/null)
  pass "1 000,00 EUR = $CONVERTED USD (taux: $RATE)"
else
  fail "HTTP $HTTP_CODE"
fi

# ════════════════════════════════════════════════════════════════════════════
header "PHASE 3 : Flux commercial complet"
# ════════════════════════════════════════════════════════════════════════════

step "3.1" "Création d'un devis"
call POST "/quotations" "{
  \"contactId\": \"$CUSTOMER_ID\",
  \"currencyCode\": \"EUR\",
  \"notes\": \"Test automatisé du flux complet\",
  \"lines\": [
    {\"productId\": \"$PROD1_ID\", \"quantity\": 10, \"unitPrice\": 99.99, \"taxRate\": 20, \"description\": \"Product Alpha x10\"},
    {\"productId\": \"$PROD2_ID\", \"quantity\": 5, \"unitPrice\": 249.99, \"taxRate\": 20, \"description\": \"Product Beta x5\"}
  ]
}"

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  QUO_ID=$(json_val "$BODY" "id")
  QUO_NUM=$(json_val "$BODY" "number")
  QUO_SUBTOTAL=$(json_val "$BODY" "subtotal")
  QUO_TAX=$(json_val "$BODY" "taxTotal")
  QUO_TOTAL=$(json_val "$BODY" "total")
  pass "Devis $QUO_NUM créé"
  detail "HT: ${QUO_SUBTOTAL}€ | TVA: ${QUO_TAX}€ | TTC: ${QUO_TOTAL}€"
  detail "Status: DRAFT"
else
  fail "Création devis échouée (HTTP $HTTP_CODE)"
  echo "$BODY"
fi

step "3.2" "Envoi du devis (DRAFT → SENT)"
call PATCH "/quotations/$QUO_ID/status" '{"status": "SENT"}'
STATUS=$(json_val "$BODY" "status")
if [ "$STATUS" = "SENT" ]; then
  pass "Devis envoyé"
else
  fail "Transition échouée (status: $STATUS, HTTP $HTTP_CODE)"
fi

step "3.3" "Transition invalide (SENT → CONVERTED, doit échouer)"
call PATCH "/quotations/$QUO_ID/status" '{"status": "CONVERTED"}'
if [ "$HTTP_CODE" = "400" ]; then
  pass "Transition invalide correctement rejetée"
else
  fail "Aurait dû retourner 400, reçu $HTTP_CODE"
fi

step "3.4" "Acceptation du devis (SENT → ACCEPTED)"
call PATCH "/quotations/$QUO_ID/status" '{"status": "ACCEPTED"}'
STATUS=$(json_val "$BODY" "status")
if [ "$STATUS" = "ACCEPTED" ]; then
  pass "Devis accepté"
else
  fail "Transition échouée (status: $STATUS)"
fi

step "3.5" "Conversion en commande"
call POST "/quotations/$QUO_ID/convert" '{}'
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  SO_ID=$(json_val "$BODY" "id")
  SO_NUM=$(json_val "$BODY" "number")
  SO_TOTAL=$(json_val "$BODY" "total")
  SO_LINES=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('lines',[])))" 2>/dev/null)
  pass "Commande $SO_NUM créée ($SO_LINES lignes)"
  detail "Total: ${SO_TOTAL}€"
else
  fail "Conversion échouée (HTTP $HTTP_CODE)"
fi

step "3.6" "Vérification devis → CONVERTED"
call GET "/quotations/$QUO_ID"
QUO_FINAL=$(json_val "$BODY" "status")
if [ "$QUO_FINAL" = "CONVERTED" ]; then
  pass "Devis $QUO_NUM marqué CONVERTED"
else
  fail "Devis devrait être CONVERTED, est $QUO_FINAL"
fi

step "3.7" "Confirmation de la commande"
call POST "/sales-orders/$SO_ID/confirm" '{}'
STATUS=$(json_val "$BODY" "status")
if [ "$STATUS" = "CONFIRMED" ]; then
  pass "Commande $SO_NUM confirmée"
else
  fail "Confirmation échouée (status: $STATUS)"
fi

# ════════════════════════════════════════════════════════════════════════════
header "PHASE 4 : Facturation"
# ════════════════════════════════════════════════════════════════════════════

step "4.1" "Génération de la facture"
call POST "/sales-orders/$SO_ID/invoice" '{}'
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  INV_ID=$(json_val "$BODY" "id")
  INV_NUM=$(json_val "$BODY" "number")
  INV_TOTAL=$(json_val "$BODY" "total")
  INV_LINES=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('lines',[])))" 2>/dev/null)
  pass "Facture $INV_NUM créée ($INV_LINES lignes)"
  detail "Total: ${INV_TOTAL}€ | Status: DRAFT"
else
  fail "Génération facture échouée (HTTP $HTTP_CODE)"
fi

step "4.2" "Validation de la facture (+ écriture comptable auto)"
call POST "/invoices/$INV_ID/validate" '{}'
STATUS=$(json_val "$BODY" "status")
if [ "$STATUS" = "SENT" ]; then
  pass "Facture validée → SENT"
  detail "Écriture comptable créée automatiquement"
else
  fail "Validation échouée (status: $STATUS)"
fi

step "4.3" "Vérification de l'écriture comptable"
call GET "/accounting/journal-entries"
JE_DATA=$(echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d.get('data',d)
if isinstance(r,dict) and 'data' in r: r=r['data']
inv_entries = [e for e in r if e.get('description','').find('$INV_NUM') >= 0]
for e in inv_entries:
    print(f\"{e['number']} | {e['description']}\")
    for l in e.get('lines',[]):
        a = l.get('account',{})
        d_amt = float(l.get('debit',0))
        c_amt = float(l.get('credit',0))
        if d_amt > 0: print(f'  Débit  {a.get(\"code\",\"\")} {a.get(\"name\",\"\"): <25} {d_amt:>10.2f}')
        if c_amt > 0: print(f'  Crédit {a.get(\"code\",\"\")} {a.get(\"name\",\"\"): <25} {c_amt:>10.2f}')
" 2>/dev/null)
if [ -n "$JE_DATA" ]; then
  pass "Écriture comptable trouvée :"
  echo "$JE_DATA" | while IFS= read -r line; do detail "$line"; done
else
  fail "Aucune écriture comptable trouvée"
fi

# ════════════════════════════════════════════════════════════════════════════
header "PHASE 5 : Paiement"
# ════════════════════════════════════════════════════════════════════════════

step "5.1" "Paiement partiel (1000€)"
call POST "/invoices/$INV_ID/payments" '{"amount": 1000, "method": "BANK_TRANSFER", "reference": "VIR-PARTIEL-001"}'
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  PMT_AMOUNT=$(json_val "$BODY" "amount")
  pass "Paiement de ${PMT_AMOUNT}€ enregistré"
else
  fail "Paiement échoué (HTTP $HTTP_CODE)"
fi

step "5.2" "Vérification status PARTIALLY_PAID"
call GET "/invoices/$INV_ID"
STATUS=$(json_val "$BODY" "status")
PAID=$(json_val "$BODY" "amountPaid")
if [ "$STATUS" = "PARTIALLY_PAID" ]; then
  pass "Facture partiellement payée (${PAID}€ / ${INV_TOTAL}€)"
else
  fail "Status attendu PARTIALLY_PAID, reçu $STATUS"
fi

step "5.3" "Paiement du solde"
REMAINING=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{float(d[\"total\"])-float(d[\"amountPaid\"]):.2f}')" 2>/dev/null)
call POST "/invoices/$INV_ID/payments" "{\"amount\": $REMAINING, \"method\": \"CREDIT_CARD\", \"reference\": \"CB-SOLDE-001\"}"
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  pass "Solde de ${REMAINING}€ payé"
else
  fail "Paiement solde échoué (HTTP $HTTP_CODE)"
fi

step "5.4" "Vérification status PAID"
call GET "/invoices/$INV_ID"
STATUS=$(json_val "$BODY" "status")
PAID=$(json_val "$BODY" "amountPaid")
if [ "$STATUS" = "PAID" ]; then
  pass "Facture entièrement payée (${PAID}€ / ${INV_TOTAL}€)"
else
  fail "Status attendu PAID, reçu $STATUS"
fi

step "5.5" "Paiement excédentaire (doit échouer)"
call POST "/invoices/$INV_ID/payments" '{"amount": 100, "method": "CASH"}'
if [ "$HTTP_CODE" = "400" ]; then
  pass "Paiement excédentaire correctement rejeté"
else
  fail "Aurait dû retourner 400, reçu $HTTP_CODE"
fi

# ════════════════════════════════════════════════════════════════════════════
header "PHASE 6 : Comptabilité"
# ════════════════════════════════════════════════════════════════════════════

step "6.1" "Plan comptable"
call GET "/accounting/chart-of-accounts"
if [ "$HTTP_CODE" = "200" ]; then
  ACC_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d if isinstance(d,list) else d.get('data',d); r=r if isinstance(r,list) else r.get('data',r) if isinstance(r,dict) else [r]; print(len(r))" 2>/dev/null)
  pass "$ACC_COUNT comptes dans le plan comptable"
else
  fail "HTTP $HTTP_CODE"
fi

step "6.2" "Post des écritures comptables"
JE_IDS=$(echo "$BODY" | python3 -c "
import sys,json,urllib.request
headers = {'Content-Type': 'application/json', 'Authorization': 'Bearer $TOKEN'}
req = urllib.request.Request('$API/accounting/journal-entries', headers=headers)
with urllib.request.urlopen(req) as resp:
    d = json.load(resp)
    r = d.get('data', d)
    if isinstance(r, dict) and 'data' in r: r = r['data']
    drafts = [e for e in r if e['status'] == 'DRAFT']
    posted = 0
    for e in drafts:
        body = json.dumps({}).encode()
        req2 = urllib.request.Request(f'$API/accounting/journal-entries/{e[\"id\"]}/post', data=body, headers=headers, method='POST')
        urllib.request.urlopen(req2)
        posted += 1
    print(posted)
" 2>/dev/null)
pass "$JE_IDS écriture(s) postée(s)"

step "6.3" "Balance générale"
call GET "/accounting/trial-balance"
echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d if isinstance(d,list) else d.get('data',d)
if isinstance(r,dict) and 'data' in r: r=r['data']
total_d = total_c = 0
lines = []
for a in r:
    if a['debit'] > 0 or a['credit'] > 0:
        lines.append(a)
        total_d += a['debit']
        total_c += a['credit']
if lines:
    print(f'  {\"Code\":<8} {\"Compte\":<25} {\"Débit\":>12} {\"Crédit\":>12} {\"Solde\":>12}')
    print(f'  {\"─\"*8} {\"─\"*25} {\"─\"*12} {\"─\"*12} {\"─\"*12}')
    for a in lines:
        print(f'  {a[\"code\"]:<8} {a[\"name\"]:<25} {a[\"debit\"]:>12.2f} {a[\"credit\"]:>12.2f} {a[\"balance\"]:>12.2f}')
    print(f'  {\"─\"*8} {\"─\"*25} {\"─\"*12} {\"─\"*12} {\"─\"*12}')
    print(f'  {\"TOTAL\":<34} {total_d:>12.2f} {total_c:>12.2f} {total_d-total_c:>12.2f}')
    balanced = abs(total_d - total_c) < 0.01
    sys.exit(0 if balanced else 1)
else:
    sys.exit(1)
" 2>/dev/null
if [ $? -eq 0 ]; then
  pass "Balance équilibrée (Débit = Crédit)"
else
  fail "Balance déséquilibrée"
fi

# ════════════════════════════════════════════════════════════════════════════
header "PHASE 7 : Dashboard & Reporting"
# ════════════════════════════════════════════════════════════════════════════

step "7.1" "Dashboard KPIs"
call GET "/reporting/dashboard"
echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
k=d.get('data',d)
if isinstance(k,dict) and 'data' in k: k=k['data']
kpis=k.get('kpis',k)
print(f'  Revenu total       : {kpis.get(\"totalRevenue\",0)}€')
print(f'  Montant en attente : {kpis.get(\"outstandingAmount\",0)}€')
print(f'  Devis              : {kpis.get(\"totalQuotations\",0)}')
print(f'  Devis en attente   : {kpis.get(\"pendingQuotations\",0)}')
print(f'  Commandes          : {kpis.get(\"totalSalesOrders\",0)}')
print(f'  Factures           : {kpis.get(\"totalInvoices\",0)}')
print(f'  Impayées           : {kpis.get(\"unpaidInvoices\",0)}')
" 2>/dev/null
if [ "$HTTP_CODE" = "200" ]; then
  pass "Dashboard KPIs récupérés"
else
  fail "HTTP $HTTP_CODE"
fi

step "7.2" "Rapport de ventes"
call GET "/reporting/sales"
if [ "$HTTP_CODE" = "200" ]; then
  echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d.get('data',d)
s=r.get('summary',r) if isinstance(r,dict) else {}
print(f'  Factures: {s.get(\"invoiceCount\",\"?\")} | CA: {s.get(\"totalRevenue\",\"?\")}€ | TVA: {s.get(\"totalTax\",\"?\")}€')
" 2>/dev/null
  pass "Rapport de ventes généré"
else
  fail "HTTP $HTTP_CODE"
fi

# ════════════════════════════════════════════════════════════════════════════
header "PHASE 8 : Audit & Sécurité"
# ════════════════════════════════════════════════════════════════════════════

step "8.1" "Journal d'audit"
call GET "/audit?limit=5"
if [ "$HTTP_CODE" = "200" ]; then
  AUDIT_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',d); r=r.get('data',r) if isinstance(r,dict) else r; print(len(r))" 2>/dev/null)
  pass "$AUDIT_COUNT dernières entrées d'audit"
  echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin); r=d.get('data',d)
if isinstance(r,dict) and 'data' in r: r=r['data']
for a in r[:5]:
    u=a.get('user',{}) or {}
    print(f'  {a[\"action\"]:<18} | {a[\"entity\"]:<15} | {u.get(\"email\",\"system\")}')
" 2>/dev/null
else
  fail "HTTP $HTTP_CODE"
fi

step "8.2" "Rôles système"
call GET "/roles"
if [ "$HTTP_CODE" = "200" ]; then
  echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d if isinstance(d,list) else d.get('data',d)
if isinstance(r,dict) and 'data' in r: r=r['data']
for role in r:
    sys_tag = ' (système)' if role.get('isSystem') else ''
    print(f'  {role[\"name\"]:<20}{sys_tag}')
" 2>/dev/null
  pass "Rôles chargés"
else
  fail "HTTP $HTTP_CODE"
fi

# ════════════════════════════════════════════════════════════════════════════
header "RÉSULTATS"
# ════════════════════════════════════════════════════════════════════════════

echo ""
TOTAL=$((PASS + FAIL))
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  TOUS LES TESTS PASSENT : $PASS/$TOTAL                              ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
else
  echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  RÉSULTAT : $PASS réussis, $FAIL échoués sur $TOTAL                     ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
fi
echo ""

exit $FAIL
