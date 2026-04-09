# Architecture

> Detailed architectural documentation for the ERP SaaS Platform.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Layer Separation](#layer-separation)
- [Multi-Tenancy](#multi-tenancy)
- [Authentication & Authorization](#authentication--authorization)
- [Data Flow](#data-flow)
- [Event & Queue Architecture](#event--queue-architecture)
- [Scaling Strategy](#scaling-strategy)

---

## System Architecture

### Modular Monolith

The backend is built as a **modular monolith** — a single NestJS application composed of independent, self-contained modules. Each module encapsulates its own controller, service, DTOs, and Prisma queries.

**Why a modular monolith (not microservices)?**

| Factor | Monolith Advantage |
|---|---|
| **Development speed** | No inter-service communication overhead, shared database, single deployment |
| **Operational simplicity** | One process to monitor, one database to back up, one deployment pipeline |
| **Refactoring ease** | Move code between modules with IDE refactoring tools, no API contracts to maintain |
| **Cost efficiency** | Single server for small/medium traffic, no service mesh or API gateway overhead |
| **Team size** | Ideal for small to medium teams (1–10 developers) |

**Designed for extraction:** Each module communicates through well-defined service interfaces. Module boundaries are enforced through NestJS's dependency injection system. When a module grows beyond the monolith's capacity, it can be extracted into a standalone service by:

1. Promoting its service interface to an API contract
2. Replacing direct method calls with HTTP or message queue communication
3. Giving it its own database schema (or separate database)

### Module Registry

The root `AppModule` composes all feature modules:

```
AppModule
├── ConfigModule (global configuration)
├── ScheduleModule (cron jobs)
├── DatabaseModule (Prisma client)
├── AuthModule
├── TenantModule
├── UserModule
├── RoleModule
├── AuditModule
├── ContactModule
├── ProductModule
├── InventoryModule
├── SalesModule
├── PurchasingModule
├── InvoicingModule
├── AccountingModule
├── CurrencyModule
├── LegalModule
├── ReportingModule
└── QueueModule (BullMQ processors)
```

---

## Layer Separation

The application is organized into three conceptual layers. These layers represent different concerns of the business and have clearly defined interaction patterns.

### 1. Business Logic Layer

The operational core of the ERP system.

| Module | Responsibility |
|---|---|
| **Contacts** | Customer and supplier registry with addresses, credit limits, payment terms |
| **Products** | Product/service catalog with pricing, categories, units of measure |
| **Inventory** | Multi-warehouse stock management, stock movements, valuation |
| **Sales** | Quotation lifecycle (DRAFT → SENT → ACCEPTED → CONVERTED), sale order management |
| **Purchasing** | Purchase order lifecycle, goods receipt with partial delivery support |

These modules deal with day-to-day business operations. They generate the events and data that flow into the financial layer.

### 2. Financial Layer

Handles all monetary transactions and ensures financial integrity.

| Module | Responsibility |
|---|---|
| **Invoicing** | Invoice creation (from orders or standalone), credit/debit notes, payment recording |
| **Accounting** | Chart of accounts (hierarchical), journal entries (double-entry), fiscal years |
| **Financial Reports** | Trial balance, profit & loss, balance sheet |

The financial layer enforces double-entry bookkeeping: every journal entry must balance (total debits = total credits). Journal entries are auto-generated from invoices and payments via the accounting queue processor.

### 3. Legal / Configuration Layer

Provides jurisdiction-specific rules and reference data.

| Module | Responsibility |
|---|---|
| **Legal** | Tax rates (VAT, Sales Tax, GST, Custom), countries, tax labels |
| **Currency** | Currency registry, exchange rates, currency conversion |

This layer is consumed by both the business and financial layers. For example:
- When creating an invoice line, the tax rate from the legal layer determines the tax amount
- When recording a multi-currency transaction, the exchange rate from the currency module converts to the base currency for accounting

### Layer Interaction Pattern

```
┌───────────────────┐
│  Business Logic    │
│  (Sales, PO, Inv)  │
└────────┬──────────┘
         │ Triggers (e.g., "invoice confirmed" → create journal entry)
         ▼
┌───────────────────┐
│  Financial Layer   │
│  (Invoicing, Acct) │
└────────┬──────────┘
         │ References (e.g., tax calculation, currency conversion)
         ▼
┌───────────────────┐
│  Legal / Config    │
│  (Tax, Currency)   │
└───────────────────┘
```

**Key principle:** Business flows downward. The financial layer never initiates business transactions — it reacts to them. The legal layer is purely referential — it provides configuration data but never modifies business or financial state.

---

## Multi-Tenancy

### Approach: Row-Level Tenancy

Every business entity in the database includes a `tenantId` column. Data isolation is enforced at the application level, not the database level.

```
┌──────────────────────────────────────────────┐
│              PostgreSQL Database              │
│                                              │
│  ┌───────────────────────────────────────┐   │
│  │         invoices table                │   │
│  │  id │ tenantId │ number │ total │ ... │   │
│  │  1  │ tenant_A │ INV-001│ 5000  │     │   │
│  │  2  │ tenant_B │ INV-001│ 3200  │     │   │
│  │  3  │ tenant_A │ INV-002│ 1500  │     │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  Queries always include: WHERE tenantId = ?  │
└──────────────────────────────────────────────┘
```

### Implementation

Tenant isolation is enforced through three components that work together:

#### 1. TenantGuard

A global guard registered via `APP_GUARD`. Runs on every authenticated request.

- Extracts `X-Tenant-Id` from the request header
- Extracts `tenantId` from the authenticated user's JWT payload
- Validates that if both are present, they match (prevents cross-tenant access)
- Resolves the final `tenantId` and attaches it to `request.tenantId`
- Throws `ForbiddenException` on tenant mismatch
- Throws `BadRequestException` if no tenant context can be resolved
- Skips validation for routes marked with `@Public()`

#### 2. TenantContextInterceptor

A global interceptor that ensures tenant context is available downstream.

- Falls back to `request.user.tenantId` or `X-Tenant-Id` header if not already set
- For write operations (POST, PUT, PATCH), automatically injects `tenantId` into the request body

#### 3. Service-Level Filtering

Every service method includes `tenantId` in its Prisma queries:

```typescript
// Every query is scoped to the tenant
const invoices = await this.prisma.invoice.findMany({
  where: { tenantId, status: 'SENT' },
});
```

### Benefits and Trade-offs

| Benefit | Trade-off |
|---|---|
| **Simple operations** — single database to manage | **Less isolation** — a bug could leak data across tenants |
| **Cost-effective** — shared infrastructure | **Noisy neighbor** — one tenant's heavy queries affect others |
| **Easy querying** — no connection switching | **Schema changes** — migrations affect all tenants simultaneously |
| **Straightforward backups** — single database dump | **Per-tenant backup** — requires filtering, not trivial |

### Future Enhancement

For high-value enterprise tenants requiring stronger isolation, the system could be extended to support:
- **Schema-per-tenant**: Each tenant gets their own PostgreSQL schema within the same database
- **Database-per-tenant**: Complete isolation with dedicated database instances

The current architecture makes this possible by centralizing tenant resolution in the guard/interceptor layer.

---

## Authentication & Authorization

### Authentication Flow

```
┌─────────┐      POST /auth/login         ┌─────────┐
│  Client  │ ──────────────────────────▶   │  Auth    │
│          │      { email, password }      │  Service │
│          │                               │          │
│          │  ◀──────────────────────────  │          │
│          │   { accessToken,              │          │
│          │     refreshToken,             │          │
│          │     user: {...} }             │          │
└─────────┘                               └─────────┘
     │
     │  Authorization: Bearer <accessToken>
     │  X-Tenant-Id: <tenantId>
     ▼
┌─────────┐      GET /sales/orders        ┌─────────┐
│  Client  │ ──────────────────────────▶   │  JWT     │
│          │                               │  Guard   │
│          │                               │  ↓       │
│          │                               │  Tenant  │
│          │  ◀──────────────────────────  │  Guard   │
│          │   { data: [...], meta: {...} }│  ↓       │
└─────────┘                               │  Handler │
                                          └─────────┘
```

- **JWT Access Token**: Short-lived token containing `sub` (user ID), `email`, `tenantId`, and `role`
- **JWT Refresh Token**: Used to obtain new access tokens without re-authenticating
- **Token Expiration**: Configurable via `JWT_EXPIRATION` environment variable (default: 24h)

### Authorization: RBAC with Permissions

The system uses a two-level authorization model:

**Level 1 — Role-Based Access Control (RBAC):**
- Users are assigned to roles (e.g., Admin, Manager, Accountant, Sales Rep)
- Roles are tenant-scoped (each tenant defines their own roles)
- System roles (e.g., Admin) are pre-created and cannot be deleted
- Controllers use `@Roles('Admin', 'Manager')` to restrict access

**Level 2 — Permission-Based Access Control:**
- Roles are assigned granular permissions (e.g., `Invoice:CREATE`, `User:DELETE`)
- Permissions are defined as resource + action pairs
- Actions: CREATE, READ, UPDATE, DELETE, EXPORT, APPROVE
- Controllers use `@Permissions('Invoice:CREATE')` for fine-grained control

```
User → Role → Permissions[]

Example:
  Sales Manager → [
    Sales:CREATE, Sales:READ, Sales:UPDATE,
    Invoice:CREATE, Invoice:READ,
    Contact:READ, Product:READ
  ]
```

### Global Guards

Guards are registered globally via `APP_GUARD` in the root module:

1. **JwtAuthGuard** — Validates the JWT token on every request (skips `@Public()` routes)
2. **TenantGuard** — Validates and resolves tenant context (skips `@Public()` routes)

Opt-out is handled via the `@Public()` decorator (used on `/auth/login`, `/auth/register`).

---

## Data Flow

### Request Lifecycle

Every HTTP request passes through a well-defined pipeline:

```
HTTP Request
  │
  ▼
┌──────────────────────┐
│  1. Global Pipes     │  ValidationPipe: whitelist, transform, forbidNonWhitelisted
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  2. Global Guards    │  JwtAuthGuard → TenantGuard
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  3. Interceptors     │  TenantContextInterceptor (pre) → AuditInterceptor (pre)
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  4. Route Guards     │  RolesGuard, PermissionsGuard (on specific controllers)
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  5. Controller       │  Route handler, parameter extraction
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  6. Service          │  Business logic, Prisma queries
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  7. Prisma / DB      │  PostgreSQL query execution
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  8. Response         │  TransformInterceptor wraps in { data, meta }
│     Pipeline         │  AuditInterceptor logs write operations
└──────────┬───────────┘
           ▼
HTTP Response
```

### Error Handling

Two global exception filters catch and format errors:

1. **HttpExceptionFilter** — Catches all NestJS HTTP exceptions, formats them with `statusCode`, `message`, `error`, `path`, `timestamp`, and optional `correlationId`
2. **PrismaExceptionFilter** — Catches Prisma-specific errors (unique constraint violations, record not found, etc.) and translates them to appropriate HTTP status codes

### Audit Trail

The `AuditInterceptor` automatically logs all write operations (POST, PUT, PATCH, DELETE):
- Records the action, resource path, user ID, tenant ID, request body (sanitized), response status, duration, IP address, and user agent
- Sensitive fields (`password`, `token`, `secret`, `creditCard`, `ssn`) are redacted from the log
- Persisted to the `AuditLog` table for compliance and debugging

---

## Event & Queue Architecture

### BullMQ Integration

The application uses BullMQ (backed by Redis) for asynchronous job processing. This decouples time-consuming operations from the request/response cycle.

```
┌─────────────┐        ┌───────────────┐        ┌──────────────┐
│  Service     │ ──▶    │  Redis Queue   │ ──▶    │  Processor   │
│  (Producer)  │  add() │  (BullMQ)      │  job   │  (Consumer)  │
└─────────────┘        └───────────────┘        └──────────────┘
```

### Queue Configuration

All queues share default job options:
- **Retry**: 3 attempts with exponential backoff (1s, 2s, 4s)
- **Cleanup**: Completed jobs kept (100 max), failed jobs kept (500 max)

### Registered Queues

| Queue Name | Processor | Jobs | Description |
|---|---|---|---|
| `invoice-processing` | `InvoiceProcessor` | `generate-pdf`, `send-email` | PDF generation and email delivery for invoices |
| `stock-update` | `StockProcessor` | `update-stock`, `low-stock-alert` | Stock level updates and low-stock notifications |
| `accounting-sync` | `AccountingProcessor` | `create-invoice-journal`, `create-payment-journal` | Auto-creates journal entries from invoices and payments |
| `email-notification` | — | — | General email notification queue (extensible) |

### Accounting Sync Flow

When an invoice is confirmed or a payment is recorded, the invoicing service enqueues a job:

```
Invoice Confirmed
  │
  ▼
InvoicingService.send()
  │
  ├─▶ accounting-sync queue: { job: 'create-invoice-journal', data: { invoiceId, tenantId, userId } }
  │
  ▼
AccountingProcessor.handleInvoiceJournal()
  │
  ├─▶ Reads invoice with lines, contact, and tax details
  ├─▶ Creates JournalEntry with lines:
  │     Debit:  Accounts Receivable (total)
  │     Credit: Revenue (subtotal) + Tax Payable (taxTotal)
  └─▶ Posts the journal entry
```

Payment recording follows a similar pattern:

```
Payment Recorded
  │
  ▼
InvoicingService.recordPayment()
  │
  ├─▶ accounting-sync queue: { job: 'create-payment-journal', data: { paymentId, tenantId, userId } }
  │
  ▼
AccountingProcessor.handlePaymentJournal()
  │
  ├─▶ Creates JournalEntry:
  │     Debit:  Bank/Cash (payment amount)
  │     Credit: Accounts Receivable (payment amount)
  └─▶ Posts the journal entry
```

### Stock Update Flow

```
Goods Received (Purchasing)
  │
  ▼
PurchasingService.receiveGoods()
  │
  ├─▶ stock-update queue: { job: 'update-stock', data: { type: 'IN', quantity, ... } }
  │
  ▼
StockProcessor.handleStockUpdate()
  │
  ├─▶ Transaction: update/create StockLevel + create StockMovement
  ├─▶ Check if quantity < minStock
  └─▶ If low stock: log warning (extensible to email/webhook)
```

---

## Scaling Strategy

The system is designed to grow from a single-server deployment to a distributed architecture as traffic increases.

### Phase 1: Modular Monolith (Current)

```
┌─────────────────────────────────────┐
│         Single NestJS Process        │
│  All modules in one application      │
│  Single PostgreSQL + Redis           │
└─────────────────────────────────────┘
```

- **Traffic**: Up to ~1,000 concurrent users
- **Scaling**: Vertical (bigger server) or horizontal with multiple instances behind a load balancer
- **Database**: Single PostgreSQL instance, connection pooling via PgBouncer if needed

### Phase 2: Extract High-Traffic Modules

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Core ERP     │  │  Invoicing   │  │  Reporting   │
│  (Sales, PO,  │  │  Service     │  │  Service     │
│   Inventory)  │  │              │  │  (read-only  │
│              │  │              │  │   replicas)  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────┬────────┘                 │
                ▼                          │
         ┌──────────┐              ┌───────┴──────┐
         │ Message   │              │ Read Replica │
         │ Queue     │              │ PostgreSQL   │
         └──────────┘              └──────────────┘
```

- Extract modules that handle the most traffic or have distinct scaling needs
- Communication between services via BullMQ (already in place) or HTTP
- Reporting service reads from PostgreSQL read replicas for query-heavy analytics

### Phase 3: Full Microservices

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  API      │  │  Auth    │  │  Sales   │  │ Accounting│
│  Gateway  │──│  Service │  │  Service │  │  Service  │
│          │  └──────────┘  └──────────┘  └──────────┘
└──────────┘       │              │              │
                   └──────┬───────┘              │
                          ▼                      ▼
                   ┌──────────┐          ┌──────────┐
                   │  Event   │          │  Event   │
                   │  Bus     │◀────────▶│  Store   │
                   └──────────┘          └──────────┘
```

- API Gateway handles routing, rate limiting, and authentication
- Each service owns its database schema
- Event-driven communication via a message bus (e.g., RabbitMQ, Kafka)
- Event sourcing for critical financial transactions (audit trail, replay)
- Service mesh for observability, load balancing, and circuit breaking

### Scaling Checklist

| Concern | Current Solution | Future Solution |
|---|---|---|
| **Database** | Single PostgreSQL | Read replicas, sharding by tenant |
| **Caching** | Redis (BullMQ) | Redis Cluster, CDN for static assets |
| **Job Processing** | Single BullMQ worker | Multiple workers, dedicated queue servers |
| **File Storage** | Local/in-memory | S3-compatible object storage |
| **Search** | Prisma queries | Elasticsearch for full-text search |
| **Monitoring** | Application logs | Prometheus + Grafana, distributed tracing |
| **Load Balancing** | Single instance | Nginx/HAProxy, Kubernetes ingress |
