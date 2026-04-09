<div align="center">

# ERP SaaS Platform

**Modular, scalable, international ERP system**

[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## Overview

A full-featured, multi-tenant ERP SaaS platform inspired by Sage and Odoo. Built for small and medium businesses, it provides end-to-end management of sales, purchasing, inventory, invoicing, accounting, and reporting — all within a single deployable system.

The backend is architected as a **modular monolith** designed for eventual extraction into microservices. Row-level multi-tenancy ensures data isolation while keeping infrastructure simple and cost-effective.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 14)                 │
│             React · TailwindCSS · Zustand · Recharts         │
└─────────────────────────────┬────────────────────────────────┘
                              │ REST API
┌─────────────────────────────┴────────────────────────────────┐
│                      Backend (NestJS 10)                     │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Business    │  │  Financial   │  │  Legal / Config    │  │
│  │  Logic       │  │  Layer       │  │  Layer             │  │
│  │             │  │              │  │                    │  │
│  │  Sales      │  │  Invoicing   │  │  Tax Rates         │  │
│  │  Purchasing │  │  Accounting  │  │  Currencies        │  │
│  │  Inventory  │  │  Payments    │  │  Exchange Rates    │  │
│  │  Contacts   │  │  Journal     │  │  Countries         │  │
│  │  Products   │  │  Entries     │  │                    │  │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐   │
│  │            Shared Infrastructure                       │   │
│  │  Auth · RBAC · Tenant Guard · Audit · BullMQ Queues   │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────┬───────────────────────────┬───────────────────┘
               │                           │
        ┌──────┴──────┐            ┌───────┴───────┐
        │ PostgreSQL  │            │    Redis      │
        │   (Data)    │            │ (Cache/Queue) │
        └─────────────┘            └───────────────┘
```

- **Modular monolith** backend designed for microservices extraction
- **Row-level multi-tenancy** with tenant guards and automatic context injection
- **Three-layer separation**: Business Logic / Financial / Legal
- **Event-driven** async processing with BullMQ for PDF generation, stock updates, and accounting sync

## Tech Stack

| Technology | Purpose |
|---|---|
| **NestJS 10** | Backend framework — modular, testable, TypeScript-native |
| **Prisma 6** | Type-safe ORM and database migrations |
| **PostgreSQL 16** | Primary relational database |
| **Redis 7** | Caching, session storage, and BullMQ job queues |
| **BullMQ** | Async job processing (invoice PDFs, accounting sync, stock alerts) |
| **Next.js 14** | Frontend framework with App Router and server components |
| **React 18** | UI component library |
| **TailwindCSS 3** | Utility-first CSS framework |
| **Zustand** | Lightweight client-side state management |
| **Recharts** | Charting library for dashboards and reports |
| **React Hook Form + Zod** | Form handling with schema validation |
| **Swagger / OpenAPI** | Auto-generated API documentation |
| **Docker Compose** | Container orchestration for all services |
| **Passport.js + JWT** | Authentication with access and refresh tokens |

## Project Structure

```
erp-saas/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Data model (30+ models, enums)
│   │   └── seed.ts                # Database seeding
│   ├── src/
│   │   ├── common/
│   │   │   ├── decorators/        # @Public, @CurrentUser, @CurrentTenant, @Roles, @Permissions
│   │   │   ├── dto/               # PaginationDto
│   │   │   ├── filters/           # HttpException, PrismaException filters
│   │   │   ├── guards/            # JwtAuth, Tenant, Roles, Permissions guards
│   │   │   ├── interceptors/      # Transform, TenantContext, Audit interceptors
│   │   │   ├── interfaces/        # Shared TypeScript interfaces
│   │   │   ├── pipes/             # Custom validation pipes
│   │   │   └── utils/             # Hash, sequence utilities
│   │   ├── config/                # App configuration and validation
│   │   ├── database/              # Prisma service and module
│   │   ├── modules/
│   │   │   ├── auth/              # Authentication (register, login, JWT, refresh)
│   │   │   ├── tenant/            # Tenant management
│   │   │   ├── user/              # User CRUD
│   │   │   ├── role/              # RBAC roles and permissions
│   │   │   ├── audit/             # Audit log queries
│   │   │   ├── contact/           # Customer/supplier management
│   │   │   ├── product/           # Product catalog
│   │   │   ├── inventory/         # Warehouses, stock levels, movements
│   │   │   ├── sales/             # Quotations and sale orders
│   │   │   ├── purchasing/        # Purchase orders and goods receipt
│   │   │   ├── invoicing/         # Invoices and payments
│   │   │   ├── accounting/        # Chart of accounts, journal entries, financial reports
│   │   │   ├── currency/          # Currencies and exchange rates
│   │   │   ├── legal/             # Countries, tax rates
│   │   │   ├── reporting/         # Dashboard KPIs, sales/purchase/inventory reports
│   │   │   └── queue/             # BullMQ processors (invoice, stock, accounting)
│   │   ├── app.module.ts          # Root module
│   │   └── main.ts                # Bootstrap, Swagger setup, global pipes/filters
│   ├── Dockerfile                 # Multi-stage (deps → build → dev → production)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/            # Login, register pages
│   │   │   ├── (dashboard)/       # All ERP module pages
│   │   │   │   ├── accounting/    # Chart of accounts, journal entries, fiscal years
│   │   │   │   ├── dashboard/     # Main dashboard
│   │   │   │   ├── inventory/     # Products, warehouses, stock
│   │   │   │   ├── invoicing/     # Invoices, payments
│   │   │   │   ├── purchasing/    # Purchase orders
│   │   │   │   ├── reports/       # Reporting dashboard
│   │   │   │   ├── sales/         # Quotations, sale orders
│   │   │   │   └── settings/      # Users, roles
│   │   │   └── layout.tsx         # Root layout
│   │   ├── components/
│   │   │   ├── layout/            # Sidebar, header
│   │   │   └── ui/                # Button, card, table, modal, badge, etc.
│   │   ├── lib/
│   │   │   ├── api/               # API client (Axios) per module
│   │   │   └── stores/            # Zustand auth store
│   │   ├── middleware.ts           # Auth redirect middleware
│   │   └── types/                 # Shared TypeScript types
│   ├── Dockerfile                 # Multi-stage (deps → build → dev → production)
│   └── package.json
├── docker-compose.yml             # Production (PostgreSQL, Redis, backend, frontend, pgAdmin)
├── docker-compose.dev.yml         # Development overrides (hot reload, volume mounts)
├── Makefile                       # Developer commands (dev, test, migrate, seed, etc.)
├── .env.example                   # Environment variable template
└── docs/
    ├── architecture.md            # System architecture deep-dive
    ├── api-design.md              # API conventions and endpoint reference
    ├── data-model.md              # Entity relationships and business flows
    └── deployment.md              # Production deployment guide
```

## Quick Start

### Prerequisites

- **Docker** and **Docker Compose** (v2+)
- **Node.js 20+** (only needed for local development outside Docker)
- **Make** (optional but recommended)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd erp-saas

# Copy environment variables
cp .env.example .env

# Start everything (builds, migrates, seeds)
make init
```

This single command will:
1. Copy `.env.example` to `.env` (if not present)
2. Build all Docker containers
3. Start PostgreSQL, Redis, backend, and frontend
4. Run Prisma database migrations
5. Seed the database with sample data

### Access the Application

| Service | URL |
|---|---|
| **Frontend** | [http://localhost:3000](http://localhost:3000) |
| **Backend API** | [http://localhost:4000](http://localhost:4000) |
| **API Documentation** | [http://localhost:4000/api/docs](http://localhost:4000/api/docs) |
| **pgAdmin** (optional) | [http://localhost:5050](http://localhost:5050) |

To start pgAdmin: `make pgadmin`

## Modules

### 1. Authentication & Authorization
JWT-based authentication with access and refresh tokens. Role-Based Access Control (RBAC) with fine-grained permissions per resource and action (CREATE, READ, UPDATE, DELETE, EXPORT, APPROVE). Global guards with `@Public()` decorator for opt-out on public endpoints.

### 2. Tenant Management
Multi-tenant SaaS with row-level tenancy. Each tenant has isolated data, configurable settings, and subscription plan management (FREE, STARTER, PROFESSIONAL, ENTERPRISE). Tenant context is resolved from JWT payload or `X-Tenant-Id` header.

### 3. Contact Management
Unified contact registry for customers, suppliers, or dual-role contacts. Includes billing and shipping addresses, credit limits, payment terms, and tax identifiers.

### 4. Product Catalog
Product and service catalog with configurable pricing (purchase and sale price), tax rates, unit of measure, and category classification. Supports inventory tracking toggle per product.

### 5. Inventory & Warehouse Management
Multi-warehouse support with real-time stock levels, stock movements (IN, OUT, TRANSFER, ADJUSTMENT), reserved quantity tracking, low-stock alerts, and stock valuation reporting.

### 6. Sales (Quotations & Orders)
Full quote-to-order workflow: create quotations, send to customers, accept/reject, and convert accepted quotations into sale orders. Supports multi-currency with exchange rate capture, line-level discounts, and tax calculations.

### 7. Purchasing (Purchase Orders)
Procure-to-pay workflow: create purchase orders, send to suppliers, confirm, and record partial or full goods receipt. Automatic stock level updates on goods receipt.

### 8. Invoicing & Payments
Invoice generation from sale orders or purchase orders (or standalone). Supports sale invoices, purchase invoices, credit notes, and debit notes. Payment recording with multiple methods (cash, bank transfer, check, credit card). Automatic status transitions (DRAFT → SENT → PARTIALLY_PAID → PAID).

### 9. Accounting
Full double-entry bookkeeping with chart of accounts (hierarchical tree), journal entries with debit/credit validation, and fiscal year management. Auto-generated journal entries from invoices and payments via BullMQ. Financial reports: Trial Balance, Profit & Loss, Balance Sheet.

### 10. Currency & Exchange Rates
Multi-currency support with exchange rate management per tenant. Currency conversion API for real-time calculations. Exchange rates are captured on each business document.

### 11. Legal (Tax Rates & Countries)
Configurable tax rates by type (VAT, Sales Tax, GST, Custom) and country. Country registry with default currency and tax label configuration. Tenant-scoped tax rate management.

### 12. Reporting & Analytics
Dashboard KPIs, sales reports (by period, product, customer), purchase reports, inventory reports (stock valuation, movement summary), accounts receivable/payable aging, and revenue by period analysis.

## API Documentation

Interactive Swagger documentation is available at **[http://localhost:4000/api/docs](http://localhost:4000/api/docs)** when the backend is running.

### API Conventions

- **Base path**: All endpoints are served from the root (e.g., `/auth/login`, `/sales/quotations`)
- **Authentication**: Bearer token in the `Authorization` header
- **Tenant context**: `X-Tenant-Id` header (or resolved from JWT)
- **Pagination**: `?page=1&limit=20&sortBy=createdAt&sortOrder=desc`
- **Success response format**:
  ```json
  {
    "data": { ... },
    "meta": {
      "timestamp": "2025-01-15T10:30:00.000Z",
      "path": "/sales/quotations",
      "statusCode": 200
    }
  }
  ```
- **Error response format**:
  ```json
  {
    "statusCode": 400,
    "message": "Validation failed",
    "error": "Bad Request",
    "path": "/sales/quotations",
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
  ```

For the full API endpoint reference, see [docs/api-design.md](docs/api-design.md).

## Business Flows

### Quote-to-Cash
```
Quotation (DRAFT) → Send (SENT) → Accept (ACCEPTED) → Convert → Sale Order (DRAFT)
  → Confirm (CONFIRMED) → Create Invoice (DRAFT) → Send (SENT)
    → Record Payment (PARTIALLY_PAID / PAID)
      → Auto-create Journal Entries (Debit: A/R, Credit: Revenue + Tax)
        → Payment Journal (Debit: Bank, Credit: A/R)
```

### Procure-to-Pay
```
Purchase Order (DRAFT) → Send to Supplier (SENT) → Confirm (CONFIRMED)
  → Receive Goods (PARTIALLY_RECEIVED / RECEIVED) → Stock Update
    → Create Invoice (PURCHASE) → Record Payment
      → Auto-create Journal Entries (Debit: Expense/Inventory, Credit: A/P)
        → Payment Journal (Debit: A/P, Credit: Bank)
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_DB` | `erp_saas` | PostgreSQL database name |
| `POSTGRES_USER` | `erp_user` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `erp_password` | PostgreSQL password |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `REDIS_PORT` | `6379` | Redis port |
| `BACKEND_PORT` | `4000` | Backend API port |
| `NODE_ENV` | `development` | Node environment |
| `JWT_SECRET` | (change me) | Secret key for JWT signing |
| `JWT_EXPIRATION` | `24h` | JWT token expiration time |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins (comma-separated) |
| `FRONTEND_PORT` | `3000` | Frontend port |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | API URL for the frontend |
| `PGADMIN_PORT` | `5050` | pgAdmin port |
| `PGADMIN_EMAIL` | `admin@erp.local` | pgAdmin login email |
| `PGADMIN_PASSWORD` | `admin` | pgAdmin login password |

## Development

### Common Commands

```bash
# Start development environment (hot reload)
make dev

# Start in background
make dev-d

# Stop development environment
make dev-down

# View logs
make logs              # All services
make logs-backend      # Backend only
make logs-frontend     # Frontend only

# Database
make migrate           # Run migrations (production)
make migrate-dev       # Create new migration
make seed              # Seed database
make db-reset          # Reset database (destroys data)
make db-studio         # Open Prisma Studio

# Testing
make test              # Run backend unit tests
make test-cov          # Tests with coverage
make test-e2e          # End-to-end tests

# Code quality
make lint              # Run linters
make format            # Format code

# Shell access
make shell-backend     # Open shell in backend container
make shell-frontend    # Open shell in frontend container
make shell-db          # Open psql shell

# Cleanup
make clean             # Remove all containers, volumes, images
make prune             # Remove dangling Docker resources
```

### Running Without Docker

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev

# Frontend (in separate terminal)
cd frontend
npm install
npm run dev
```

Requires a running PostgreSQL and Redis instance. Update `DATABASE_URL` and `REDIS_URL` environment variables accordingly.

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** changes: `git commit -m 'feat: add my feature'`
4. **Push** to the branch: `git push origin feature/my-feature`
5. **Open** a Pull Request

### Guidelines

- Follow the existing code structure and naming conventions
- Each module is self-contained: controller, service, DTOs, and module file
- Use Prisma migrations for all schema changes (`make migrate-dev`)
- Write tests for new features
- Use conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
- Ensure `make lint` passes before submitting

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | System architecture, multi-tenancy, auth, data flow, scaling strategy |
| [API Design](docs/api-design.md) | API conventions, full endpoint reference, response examples |
| [Data Model](docs/data-model.md) | Entity relationships, business flows, multi-currency, double-entry accounting |
| [Deployment](docs/deployment.md) | Production deployment, SSL, monitoring, backups |

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
