# ERP SaaS - Modular Multi-Tenant Enterprise Resource Planning

Production-ready foundation for a modular SaaS ERP system, comparable to Sage or Odoo. Built with modern architecture patterns, clear separation of business/financial/legal layers, and designed for international multi-tenant deployment.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Dashboard │ │  Sales   │ │Inventory │ │Accounting│  ...      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                   Zustand State │ React Query Cache             │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API (JWT Bearer)
┌────────────────────────┴────────────────────────────────────────┐
│                      BACKEND (NestJS)                           │
│                                                                 │
│  ┌─── CORE LAYER ───────────────────────────────────────────┐  │
│  │  Auth (JWT) │ Multi-Tenant │ RBAC │ Audit Log            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─── BUSINESS LAYER ──────────────────────────────────────┐   │
│  │  Sales │ Purchasing │ Inventory │ Contacts │ Products   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── FINANCIAL LAYER ─────────────────────────────────────┐   │
│  │  Invoicing │ Accounting (Double-Entry) │ Payments       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── LEGAL/CONFIG LAYER ──────────────────────────────────┐   │
│  │  Tax Rules │ Multi-Currency │ Country Config            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└────────────┬─────────────┬──────────────┬───────────────────────┘
             │             │              │
    ┌────────┴───┐  ┌──────┴─────┐  ┌─────┴────┐
    │ PostgreSQL │  │   Redis    │  │  Queue   │
    │  (Prisma)  │  │  (Cache)   │  │  (Bull)  │
    └────────────┘  └────────────┘  └──────────┘
```

## Key Design Decisions

### Why PostgreSQL over MongoDB
- **Double-entry accounting** requires ACID transactions and referential integrity
- Complex relational queries across invoices, journal entries, and chart of accounts
- Row-level security potential for multi-tenancy scaling
- Prisma ORM provides type-safe queries with migration support

### Why NestJS over Express
- Built-in module system maps perfectly to ERP domain modules
- Dependency injection for clean service composition
- Guards and interceptors for cross-cutting concerns (auth, tenancy, audit)
- Native TypeScript with decorators for Swagger API documentation

### Multi-Tenancy Strategy: Shared Database, Tenant Column
- All tables include `tenant_id` with composite indexes
- TenantGuard automatically injects tenant context from JWT
- Scalable from single-tenant to thousands without schema changes
- Future path: can migrate to schema-per-tenant for enterprise isolation

### Three-Layer Separation
1. **Business Layer**: Sales, Purchasing, Inventory — pure business operations
2. **Financial Layer**: Invoicing, Accounting — double-entry bookkeeping, payment tracking
3. **Legal Layer**: Tax rules, currencies, country configs — jurisdiction-specific, configurable per tenant

## Project Structure

```
erp-saas/
├── apps/
│   ├── backend/                  # NestJS API
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Complete data model (20+ tables)
│   │   │   └── seed.ts           # Demo data seeder
│   │   └── src/
│   │       ├── common/           # Shared utilities
│   │       │   ├── decorators/   # @TenantId, @CurrentUser, @Public, @RequirePermissions
│   │       │   ├── filters/      # Global exception handling
│   │       │   ├── guards/       # Permission guard
│   │       │   ├── interceptors/ # Response transformation
│   │       │   ├── interfaces/   # Shared types
│   │       │   ├── prisma/       # Database service (global)
│   │       │   └── utils/        # Sequence generator
│   │       ├── core/             # Platform infrastructure
│   │       │   ├── auth/         # JWT auth, registration, login
│   │       │   ├── tenant/       # Multi-tenant management
│   │       │   ├── user/         # User CRUD
│   │       │   ├── role/         # RBAC management
│   │       │   └── audit/        # Audit trail
│   │       └── modules/          # Business domain modules
│   │           ├── sales/        # Quotations, Sales Orders, Contacts
│   │           ├── purchasing/   # Purchase Orders
│   │           ├── inventory/    # Products, Warehouses, Stock
│   │           ├── invoicing/    # Invoices, Payments
│   │           ├── accounting/   # Chart of Accounts, Journal Entries
│   │           ├── tax/          # Tax rules per country
│   │           ├── currency/     # Multi-currency with conversion
│   │           └── reporting/    # Dashboard KPIs, Sales reports
│   └── frontend/                 # Next.js App
│       └── src/
│           ├── app/              # App Router pages
│           │   ├── auth/         # Login, Register
│           │   └── (app)/        # Protected layout with sidebar
│           │       └── dashboard/
│           ├── components/
│           │   ├── layout/       # Sidebar, Header
│           │   └── ui/           # DataTable, StatusBadge
│           ├── lib/              # API client, utilities
│           └── store/            # Zustand auth store
├── docker/                       # Dockerfiles
├── docker-compose.yml            # Full stack orchestration
└── packages/shared/              # Shared types (future)
```

## Data Model

### Core Entities
| Entity | Purpose |
|--------|---------|
| **Tenant** | Company/organization (multi-tenant root) |
| **User** | Authentication + tenant membership |
| **Role** | RBAC with JSON permissions array |
| **AuditLog** | Complete action trail per tenant |

### Business Entities
| Entity | Purpose |
|--------|---------|
| **Contact** | Customers, Suppliers, or Both |
| **Product** | Storable, Consumable, or Service |
| **Warehouse** | Multi-depot inventory locations |
| **InventoryLevel** | Real-time stock per product/warehouse |
| **StockMovement** | IN/OUT/ADJUSTMENT/TRANSFER history |
| **Quotation** | Sales proposals with line items |
| **SalesOrder** | Confirmed orders from quotations |
| **PurchaseOrder** | Supplier orders with receiving |

### Financial Entities
| Entity | Purpose |
|--------|---------|
| **Invoice** | Sales, Purchase, Credit Notes |
| **InvoiceLine** | Line items with tax calculation |
| **Payment** | Payment records against invoices |
| **ChartOfAccount** | Hierarchical account tree (ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE) |
| **JournalEntry** | Double-entry bookkeeping header |
| **JournalEntryLine** | Debit/Credit entries per account |

### Legal/Config Entities
| Entity | Purpose |
|--------|---------|
| **TaxRule** | VAT/GST/Sales tax per country |
| **TenantCurrency** | Active currencies with exchange rates |
| **Sequence** | Auto-incrementing document numbers |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register tenant + admin |
| POST | `/api/v1/auth/login` | Login (returns JWT) |

### Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/quotations` | List/Create quotations |
| GET | `/api/v1/quotations/:id` | Get quotation details |
| PATCH | `/api/v1/quotations/:id/status` | Update status |
| POST | `/api/v1/quotations/:id/convert` | Convert to sales order |
| GET | `/api/v1/sales-orders` | List sales orders |
| POST | `/api/v1/sales-orders/:id/confirm` | Confirm order |
| POST | `/api/v1/sales-orders/:id/invoice` | Generate invoice |

### Purchasing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/purchase-orders` | List/Create POs |
| POST | `/api/v1/purchase-orders/:id/receive` | Receive goods |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/products` | Product CRUD |
| GET/POST | `/api/v1/warehouses` | Warehouse management |
| POST | `/api/v1/warehouses/stock-adjustment` | Stock movements |
| GET | `/api/v1/warehouses/movements/history` | Movement history |

### Invoicing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/invoices` | List invoices |
| POST | `/api/v1/invoices/:id/validate` | Validate + create journal entry |
| POST | `/api/v1/invoices/:id/payments` | Record payment |

### Accounting
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/accounting/chart-of-accounts` | Account management |
| GET/POST | `/api/v1/accounting/journal-entries` | Journal entries |
| POST | `/api/v1/accounting/journal-entries/:id/post` | Post entry |
| GET | `/api/v1/accounting/trial-balance` | Trial balance report |

### Configuration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/tax-rules` | Tax configuration |
| GET/POST | `/api/v1/currencies` | Currency management |
| GET | `/api/v1/currencies/convert` | Currency conversion |

### Reporting
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/reporting/dashboard` | Dashboard KPIs |
| GET | `/api/v1/reporting/sales` | Sales report |

## Business Flow Example

### Quotation → Invoice → Accounting Entry

```
1. POST /quotations           → Creates QUO-00001 (DRAFT)
2. PATCH /quotations/:id/status → Status: SENT
3. PATCH /quotations/:id/status → Status: ACCEPTED
4. POST /quotations/:id/convert → Creates SO-00001, quotation → CONVERTED
5. POST /sales-orders/:id/confirm → SO status: CONFIRMED
6. POST /sales-orders/:id/invoice → Creates INV-00001 (DRAFT)
7. POST /invoices/:id/validate → INV status: SENT
   └─→ Auto-creates Journal Entry JE-00001:
       Debit:  1200 Accounts Receivable  1,200.00
       Credit: 4000 Sales Revenue        1,000.00
       Credit: 2100 Tax Payable            200.00
8. POST /invoices/:id/payments → Records payment
   └─→ Auto-creates Journal Entry JE-00002:
       Debit:  1100 Bank                 1,200.00
       Credit: 1200 Accounts Receivable  1,200.00
```

## RBAC Permissions

System ships with these default roles:
- **Admin**: `["*"]` — full access
- **Sales Manager**: sales, contacts, products, invoices
- **Accountant**: accounting, invoices, reporting
- **Warehouse Manager**: inventory, products, purchasing
- **Viewer**: read-only across all modules

Permission format: `module:action` (e.g., `sales:write`, `accounting:read`)

## Getting Started

### Prerequisites
- Node.js >= 20
- PostgreSQL 16+
- Redis 7+ (optional, for queues/caching)

### Quick Start with Docker

```bash
# Start all services
docker compose up -d

# Run database migrations
docker compose exec backend npx prisma migrate deploy

# Seed demo data
docker compose exec backend npx prisma db seed
```

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp apps/backend/.env.example apps/backend/.env

# Start PostgreSQL and Redis (Docker)
docker compose up postgres redis -d

# Generate Prisma client and run migrations
npm run db:generate
npm run db:migrate

# Seed demo data
npm run db:seed

# Start development servers
npm run dev:backend   # API on http://localhost:4000
npm run dev:frontend  # Web on http://localhost:3000

# Swagger docs
open http://localhost:4000/docs
```

### Demo Credentials
- **Tenant slug**: `demo`
- **Email**: `admin@demo.com`
- **Password**: `admin12345`

## Scaling Considerations

### From Modular Monolith to Microservices
The architecture is designed for progressive decomposition:

1. **Current**: Modular monolith — NestJS modules with clear boundaries
2. **Phase 2**: Extract high-traffic modules (Inventory, Invoicing) into separate services
3. **Phase 3**: Event-driven architecture with message queues between services

Each module already has isolated services, controllers, and DTOs — making extraction straightforward.

### Performance Optimizations
- **Database**: Composite indexes on `(tenant_id, ...)` for all queries
- **Caching**: Redis layer ready for hot data (exchange rates, tax rules, dashboard)
- **Queue**: Bull queue configured for async operations (PDF generation, email, reports)
- **Pagination**: All list endpoints support cursor-based pagination

### Multi-Tenant Scaling Path
1. **Shared DB** (current) → good for up to ~1000 tenants
2. **Schema-per-tenant** → add Prisma schema switching per request
3. **Database-per-tenant** → full isolation for enterprise customers

## Security

- JWT authentication with refresh token rotation
- bcrypt password hashing (12 rounds)
- Helmet.js for HTTP security headers
- CORS configured per environment
- Input validation with class-validator (whitelist + forbidNonWhitelisted)
- Tenant isolation enforced at guard level
- Audit trail for all write operations

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 + React 18 | Server components, App Router |
| Styling | TailwindCSS | Utility-first CSS |
| State | Zustand + React Query | Client state + server cache |
| Backend | NestJS 10 | Modular TypeScript API |
| ORM | Prisma 5 | Type-safe database access |
| Database | PostgreSQL 16 | ACID transactions, JSONB |
| Cache | Redis 7 | Session, queue, cache |
| Queue | Bull | Background jobs |
| Auth | Passport + JWT | Stateless authentication |
| Docs | Swagger/OpenAPI | Auto-generated API docs |
| Deploy | Docker Compose | Container orchestration |
