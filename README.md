# SaaS ERP — Base technique complète

ERP SaaS modulaire, multi-tenant et international construit sur **NestJS + Next.js + MongoDB**.

---

## Architecture globale

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client (Browser)                           │
│                    Next.js 14 + React + TailwindCSS                 │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS
                    ┌───────▼────────┐
                    │   Nginx (RP)   │  Rate-limit, TLS, gzip
                    └───┬────────┬───┘
                        │        │
              ┌─────────▼─┐   ┌──▼──────────┐
              │  Backend  │   │  Frontend   │
              │  NestJS   │   │  Next.js    │
              │  :3000    │   │  :3001      │
              └─────┬─────┘   └─────────────┘
                    │
          ┌─────────┼──────────┐
          │         │          │
    ┌─────▼──┐ ┌────▼───┐ ┌───▼────┐
    │MongoDB │ │ Redis  │ │ Bull   │
    │  :27017│ │ :6379  │ │ Queues │
    └────────┘ └────────┘ └────────┘
```

### Choix architectural : Monolithe Modulaire vs Microservices

Ce projet adopte un **monolithe modulaire** avec séparation forte des domaines.
C'est le bon point de départ pour une startup / scale-up :

| Critère | Monolithe Modulaire (choix actuel) | Microservices |
|---|---|---|
| Déploiement | Simple (1 container) | Complexe (orchestrateur) |
| DX | Excellent | Difficile (réseau, sérialisation) |
| Migration future | Facile (modules découplés par events) | N/A |
| Coût infra | Faible | Élevé |

Les modules communiquent via des **domain events** (NestJS EventEmitter) ce qui
permet de les extraire en microservices sans toucher à la logique métier.

---

## Arborescence

```
/
├── apps/
│   ├── backend/                     # NestJS API
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── config/              # app / db / auth / redis / logger
│   │       ├── database/            # DatabaseModule (Mongoose)
│   │       ├── common/
│   │       │   ├── decorators/      # @TenantId, @CurrentUser, @Roles, @Public
│   │       │   ├── filters/         # HttpExceptionFilter (envelope erreur)
│   │       │   ├── guards/          # JwtAuthGuard, RolesGuard
│   │       │   ├── interceptors/    # ResponseInterceptor, AuditInterceptor
│   │       │   ├── middleware/      # TenantMiddleware (X-Tenant-ID)
│   │       │   ├── dto/             # PaginationDto, PaginatedResult
│   │       │   ├── events/          # Domain events typés
│   │       │   └── schemas/         # BaseDocument abstrait
│   │       └── modules/
│   │           ├── auth/            # JWT login/logout, strategies
│   │           ├── tenants/         # CRUD tenants, slugs, plans
│   │           ├── users/           # Utilisateurs, rôles, permissions
│   │           ├── sales/           # Clients, Devis, Commandes vente
│   │           ├── inventory/       # Produits, Dépôts, Mouvements, Niveaux
│   │           ├── purchases/       # Fournisseurs, Commandes achat
│   │           ├── invoicing/       # Factures, Règles TVA
│   │           ├── accounting/      # Plan comptable, Journal (double-entrée)
│   │           ├── currencies/      # Devises, taux, conversion
│   │           └── reporting/       # KPIs, CA mensuel, Aging AR, P&L
│   └── frontend/                    # Next.js 14 App Router
│       └── src/
│           ├── app/                 # Pages (dashboard, sales, inventory…)
│           ├── components/
│           │   ├── ui/              # Button, Card, Badge (design system)
│           │   ├── layout/          # AppShell, Sidebar, Topbar
│           │   ├── dashboard/       # DashboardPage + charts
│           │   └── sales/           # QuotesPage, OrdersPage…
│           ├── hooks/               # useQuotes, useDashboardKpis…
│           ├── lib/                 # api-client (axios + interceptors), utils
│           ├── stores/              # Zustand (auth, tenant)
│           └── types/               # Types API partagés
├── infra/
│   ├── nginx/                       # nginx.conf (RP + rate-limit)
│   └── docker/                      # mongo-init.js
├── docker-compose.yml
├── .env.example
└── package.json                     # Yarn workspaces root
```

---

## Modélisation des données

### Collections MongoDB principales

| Collection | Description | Index clés |
|---|---|---|
| `tenants` | Entreprises (multi-tenant root) | `slug` unique, `domain` unique |
| `users` | Utilisateurs par tenant | `(tenantId, email)` unique |
| `customers` | Clients commerciaux | `(tenantId, email)`, fulltext `name` |
| `suppliers` | Fournisseurs | `(tenantId, name)` fulltext |
| `products` | Catalogue produits | `(tenantId, sku)` unique, fulltext `name` |
| `warehouses` | Dépôts multi-sites | `(tenantId, code)` unique |
| `stock_movements` | Flux de stock (immuable) | `(tenantId, productId, warehouseId)` |
| `stock_levels` | Vue matérialisée du stock courant | `(tenantId, productId, warehouseId)` unique |
| `quotes` | Devis commerciaux | `(tenantId, status)`, `(tenantId, customerId)` |
| `sale_orders` | Commandes vente | `(tenantId, status)`, `(tenantId, customerId)` |
| `purchase_orders` | Commandes achat | `(tenantId, status)`, `(tenantId, supplierId)` |
| `invoices` | Factures vente/achat | `(tenantId, dueDate, status)` |
| `tax_rules` | Règles TVA configurables | `(tenantId, code)` unique |
| `accounts` | Plan comptable | `(tenantId, code)` unique |
| `journal_entries` | Écritures comptables | `(tenantId, date)`, `(tenantId, referenceId)` |
| `currencies` | Taux de change par tenant | `(tenantId, code)` unique |

---

## API principales (REST v1)

```
Auth
  POST  /api/v1/auth/:tenantSlug/login
  POST  /api/v1/auth/logout

Tenants
  GET   /api/v1/tenants                  [superadmin]
  POST  /api/v1/tenants                  [superadmin]

Users
  GET   /api/v1/users                    [admin]
  POST  /api/v1/users                    [admin]
  GET   /api/v1/users/me

Commercial (Sales)
  GET   /api/v1/sales/customers
  POST  /api/v1/sales/customers
  GET   /api/v1/sales/quotes[?status=]
  POST  /api/v1/sales/quotes
  GET   /api/v1/sales/quotes/:id
  POST  /api/v1/sales/quotes/:id/convert  → SaleOrder + event
  GET   /api/v1/sales/orders

Inventaire
  GET   /api/v1/inventory/products
  POST  /api/v1/inventory/products
  GET   /api/v1/inventory/warehouses
  POST  /api/v1/inventory/warehouses
  GET   /api/v1/inventory/stock[?warehouseId=]
  POST  /api/v1/inventory/movements

Achats
  GET   /api/v1/purchases/suppliers
  POST  /api/v1/purchases/suppliers
  GET   /api/v1/purchases/orders
  POST  /api/v1/purchases/orders
  GET   /api/v1/purchases/orders/:id
  PATCH /api/v1/purchases/orders/:id/receive  → event stocks

Facturation
  GET   /api/v1/invoicing/tax-rules
  POST  /api/v1/invoicing/tax-rules
  GET   /api/v1/invoicing/invoices[?status=]
  POST  /api/v1/invoicing/invoices/from-order  → event accounting
  PATCH /api/v1/invoicing/invoices/:id/payment → event accounting

Comptabilité
  GET   /api/v1/accounting/accounts
  POST  /api/v1/accounting/accounts
  POST  /api/v1/accounting/accounts/seed        (plan PCG par défaut)
  GET   /api/v1/accounting/journal[?from=&to=]
  POST  /api/v1/accounting/journal
  GET   /api/v1/accounting/trial-balance

Devises
  GET   /api/v1/currencies
  POST  /api/v1/currencies
  GET   /api/v1/currencies/convert?amount=&from=&to=

Reporting
  GET   /api/v1/reporting/dashboard[?year=]
  GET   /api/v1/reporting/revenue-by-month[?year=]
  GET   /api/v1/reporting/ar-aging
  GET   /api/v1/reporting/income-statement[?year=]
```

---

## Flux métier complet : Devis → Facture → Écriture comptable

```
1. Vendeur crée un DEVIS (draft)
   POST /sales/quotes
   ↳ Calcul lignes (HT × qté - remise + TVA) stocké en DB

2. Devis envoyé au client (status → sent)
   PATCH /sales/quotes/:id  { status: 'sent' }

3. Client accepte → Vendeur convertit
   POST /sales/quotes/:id/convert
   ↳ Quote.status → 'converted'
   ↳ SaleOrder créée (status: confirmed)
   ↳ Event émis : sales.order.confirmed
      └── InventoryService.onSaleOrderConfirmed()
          ↳ StockMovement OUT par ligne
          ↳ StockLevel.quantity decremented (atomic $inc)

4. Facturation
   POST /invoicing/invoices/from-order
   ↳ Invoice créée avec lignes et ventilation TVA
   ↳ Event émis : invoicing.invoice.created
      └── AccountingService.onInvoiceCreated()
          ↳ JournalEntry créée (double-entrée) :
             Dr. 411000 Clients          5 980,00
               Cr. 707000 Ventes        5 000,00
               Cr. TVA_TVA20  445710      980,00

5. Paiement reçu
   PATCH /invoicing/invoices/:id/payment  { amount: 5980 }
   ↳ Invoice.status → 'paid'
   ↳ Event émis : invoicing.invoice.paid
      └── AccountingService.onInvoicePaid()
          ↳ JournalEntry :
             Dr. 512000 Banque           5 980,00
               Cr. 411000 Clients        5 980,00
```

---

## Gestion des rôles et permissions

```
Role           Permissions
────────────────────────────────────────────────────────────
superadmin     *  (tout)
admin          *  (tout dans le tenant)
accountant     accounting:*, invoicing:*, reporting:read
sales_manager  sales:*, customers:*, invoicing:read, reporting:read
sales_rep      sales:read/write, customers:read/write, invoicing:read
purchaser      purchases:*, suppliers:*, inventory:read
warehouse      inventory:read/write
viewer         *.read
```

Headers requis sur chaque requête authentifiée :
- `Authorization: Bearer <accessToken>`
- `X-Tenant-ID: <tenantObjectId>`

---

## Recommandations techniques

### Sécurité
- JWT access token 15 min + refresh token 7 jours (rotation)
- Helmet (CSP, HSTS, X-Frame-Options)
- Rate limiting Nginx (30 req/s) + NestJS ThrottlerGuard (100/min)
- Validation stricte class-validator sur tous les DTOs (`whitelist: true`)
- Mots de passe bcrypt (12 rounds)
- `X-Tenant-ID` isolé par middleware → impossible d'accéder aux données d'un autre tenant

### Performance
- Index MongoDB composites sur `(tenantId, ...)` — toutes les requêtes filtrées par tenant
- `StockLevel` comme vue matérialisée : évite les agrégations temps réel
- Balances de comptes dénormalisées (`$inc` atomique) pour reporting instantané
- Redis + Bull pour tâches asynchrones (envoi email, PDF, jobs planifiés)
- Pool MongoDB : `maxPoolSize: 20`
- `autoIndex: false` en production

### Évolutivité
- Les modules sont découplés par domain events → extraction microservices sans refacto
- Multi-tenant via `tenantId` sur chaque document (shared database, isolated data)
- Plan comptable templatable par pays à l'init du tenant
- Devises et TVA configurables par tenant (aucun hard-code)

### Monitoring
- Winston logs JSON en production (→ ELK / Datadog)
- AuditInterceptor sur toutes les mutations (who/what/when)
- Swagger UI disponible sur `/api/v1/docs` en dev
- Health check endpoint `/health` (à connecter à readiness probe K8s)

---

## Démarrage rapide

```bash
# 1. Copier les variables d'environnement
cp .env.example .env

# 2. Démarrer tous les services
docker-compose up -d

# 3. Accéder à l'API docs
open http://localhost:3000/api/v1/docs

# 4. Accéder au frontend
open http://localhost:3001
```
