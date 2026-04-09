# API Design

> Complete API reference for the ERP SaaS Platform.

---

## Table of Contents

- [API Conventions](#api-conventions)
- [Endpoints Reference](#endpoints-reference)
- [Response Examples](#response-examples)

---

## API Conventions

### Base URL

```
http://localhost:4000
```

All endpoints are served from the application root. There is no `/api/v1` prefix on routes — the API is versioned via the Swagger documentation version field.

### Authentication

All endpoints require a valid JWT Bearer token unless marked with `@Public()`.

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Tenant Context

Authenticated requests must include tenant context. This is resolved in priority order:

1. `X-Tenant-Id` header
2. `tenantId` from the JWT payload

```
X-Tenant-Id: clx1abc2d0000abcdef123456
```

If both are present, they must match — otherwise the request is rejected with `403 Forbidden`.

### Content Type

```
Content-Type: application/json
```

### Pagination

All list endpoints support pagination via query parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number (1-based) |
| `limit` | integer | `20` | Items per page (1–100) |
| `sortBy` | string | `createdAt` | Field to sort by |
| `sortOrder` | string | `desc` | Sort direction (`asc` or `desc`) |

Example: `GET /sales/quotations?page=2&limit=10&sortBy=total&sortOrder=desc`

### Success Response Format

All successful responses are wrapped by the `TransformInterceptor`:

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

For paginated responses, the `data` field contains:

```json
{
  "data": {
    "items": [ ... ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  },
  "meta": { ... }
}
```

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "path": "/sales/quotations",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

Validation errors return an array of messages:

```json
{
  "statusCode": 400,
  "message": [
    "contactId must be a string",
    "date must be a valid ISO 8601 date"
  ],
  "error": "Bad Request",
  "path": "/sales/quotations",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

When a correlation ID header is provided, it's included in the error response:

```
X-Correlation-Id: req-abc-123
```

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error",
  "path": "/sales/quotations",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "correlationId": "req-abc-123"
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (invalid/missing token) |
| `403` | Forbidden (insufficient permissions or tenant mismatch) |
| `404` | Not Found |
| `409` | Conflict (duplicate resource) |
| `422` | Unprocessable Entity (business rule violation) |
| `500` | Internal Server Error |

---

## Endpoints Reference

### Auth

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `POST` | `/auth/register` | Register new tenant with admin user | No | — |
| `POST` | `/auth/login` | Login with email and password | No | — |
| `POST` | `/auth/refresh` | Refresh access and refresh tokens | Yes | — |
| `GET` | `/auth/me` | Get current user profile | Yes | — |
| `POST` | `/auth/change-password` | Change current user password | Yes | — |

### Tenants

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `GET` | `/tenants` | List tenants (scoped) | Yes | Role: Admin |
| `GET` | `/tenants/:id` | Get tenant by ID | Yes | Role: Admin |
| `PATCH` | `/tenants/:id` | Update tenant details | Yes | Role: Admin |
| `PATCH` | `/tenants/:id/settings` | Update tenant settings | Yes | Role: Admin |

### Users

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `GET` | `/users` | List all users in tenant | Yes | Role: Admin/Manager, `User:READ` |
| `GET` | `/users/:id` | Get user by ID | Yes | `User:READ` |
| `POST` | `/users` | Create a new user | Yes | Role: Admin, `User:CREATE` |
| `PATCH` | `/users/:id` | Update a user | Yes | Role: Admin, `User:UPDATE` |
| `DELETE` | `/users/:id` | Soft-delete a user | Yes | Role: Admin, `User:DELETE` |

### Roles & Permissions

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `GET` | `/roles` | List all roles in tenant | Yes | Role: Admin/Manager, `Role:READ` |
| `GET` | `/roles/permissions` | List all available permissions | Yes | Role: Admin |
| `GET` | `/roles/:id` | Get role by ID | Yes | Role: Admin/Manager, `Role:READ` |
| `POST` | `/roles` | Create a new role | Yes | Role: Admin, `Role:CREATE` |
| `PATCH` | `/roles/:id` | Update a role | Yes | Role: Admin, `Role:UPDATE` |
| `DELETE` | `/roles/:id` | Delete a role | Yes | Role: Admin, `Role:DELETE` |
| `POST` | `/roles/:id/permissions` | Assign permissions to a role | Yes | Role: Admin, `Role:UPDATE` |
| `DELETE` | `/roles/:id/permissions/:permissionId` | Remove permission from role | Yes | Role: Admin, `Role:UPDATE` |

### Contacts

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `POST` | `/contacts` | Create a new contact | Yes | — |
| `GET` | `/contacts` | List contacts (paginated, filterable by type) | Yes | — |
| `GET` | `/contacts/:id` | Get contact by ID | Yes | — |
| `PATCH` | `/contacts/:id` | Update a contact | Yes | — |
| `DELETE` | `/contacts/:id` | Soft-delete a contact | Yes | — |

### Products

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `POST` | `/products` | Create a new product | Yes | — |
| `GET` | `/products` | List products (paginated, filterable by type/category) | Yes | — |
| `GET` | `/products/:id` | Get product by ID | Yes | — |
| `PATCH` | `/products/:id` | Update a product | Yes | — |
| `DELETE` | `/products/:id` | Soft-delete a product | Yes | — |

### Inventory — Warehouses

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `POST` | `/warehouses` | Create a new warehouse | Yes | — |
| `GET` | `/warehouses` | List all warehouses | Yes | — |
| `PATCH` | `/warehouses/:id` | Update a warehouse | Yes | — |
| `DELETE` | `/warehouses/:id` | Soft-delete a warehouse | Yes | — |

### Inventory — Stock

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `GET` | `/inventory/stock-levels` | List stock levels (filterable by warehouse/product) | Yes | — |
| `GET` | `/inventory/stock-levels/:productId` | Get stock levels for a product across warehouses | Yes | — |
| `POST` | `/inventory/movements` | Create stock movement (IN/OUT/TRANSFER/ADJUSTMENT) | Yes | — |
| `GET` | `/inventory/movements` | List stock movements (paginated, filterable) | Yes | — |
| `GET` | `/inventory/valuation` | Get stock valuation report | Yes | — |

### Sales — Quotations

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `POST` | `/sales/quotations` | Create a new quotation | Yes | — |
| `GET` | `/sales/quotations` | List quotations (paginated) | Yes | — |
| `GET` | `/sales/quotations/:id` | Get quotation by ID | Yes | — |
| `PATCH` | `/sales/quotations/:id` | Update quotation (DRAFT only) | Yes | — |
| `POST` | `/sales/quotations/:id/send` | Mark quotation as SENT | Yes | — |
| `POST` | `/sales/quotations/:id/accept` | Mark quotation as ACCEPTED | Yes | — |
| `POST` | `/sales/quotations/:id/reject` | Mark quotation as REJECTED | Yes | — |
| `POST` | `/sales/quotations/:id/convert` | Convert accepted quotation to sale order | Yes | — |

### Sales — Orders

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `POST` | `/sales/orders` | Create a new sale order | Yes | — |
| `GET` | `/sales/orders` | List sale orders (paginated) | Yes | — |
| `GET` | `/sales/orders/:id` | Get sale order by ID | Yes | — |
| `PATCH` | `/sales/orders/:id` | Update sale order (DRAFT only) | Yes | — |
| `POST` | `/sales/orders/:id/confirm` | Confirm a sale order | Yes | — |
| `POST` | `/sales/orders/:id/cancel` | Cancel a sale order | Yes | — |

### Purchasing

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `POST` | `/purchasing/orders` | Create a new purchase order | Yes | — |
| `GET` | `/purchasing/orders` | List purchase orders (paginated) | Yes | — |
| `GET` | `/purchasing/orders/:id` | Get purchase order by ID | Yes | — |
| `PATCH` | `/purchasing/orders/:id` | Update purchase order (DRAFT only) | Yes | — |
| `POST` | `/purchasing/orders/:id/send` | Send purchase order to supplier | Yes | — |
| `POST` | `/purchasing/orders/:id/confirm` | Confirm purchase order | Yes | — |
| `POST` | `/purchasing/orders/:id/receive` | Record received goods (partial/full) | Yes | — |
| `POST` | `/purchasing/orders/:id/cancel` | Cancel purchase order | Yes | — |

### Invoicing

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `POST` | `/invoices` | Create invoice (standalone or from order) | Yes | — |
| `GET` | `/invoices` | List invoices (filterable by type, status, contact, date) | Yes | — |
| `GET` | `/invoices/:id` | Get invoice by ID | Yes | — |
| `PATCH` | `/invoices/:id` | Update invoice (DRAFT only) | Yes | — |
| `POST` | `/invoices/:id/send` | Mark invoice as sent | Yes | — |
| `POST` | `/invoices/:id/void` | Void an invoice | Yes | — |
| `POST` | `/invoices/:id/payments` | Record payment for invoice | Yes | — |
| `GET` | `/invoices/:id/payments` | List payments for invoice | Yes | — |

### Accounting — Chart of Accounts

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `GET` | `/accounting/chart-of-accounts` | List chart of accounts (tree) | Yes | — |
| `POST` | `/accounting/chart-of-accounts` | Create account category | Yes | — |
| `PATCH` | `/accounting/chart-of-accounts/:id` | Update account category | Yes | — |

### Accounting — Journal Entries

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `GET` | `/accounting/journal-entries` | List journal entries (paginated) | Yes | — |
| `GET` | `/accounting/journal-entries/:id` | Get journal entry by ID | Yes | — |
| `POST` | `/accounting/journal-entries` | Create manual journal entry | Yes | — |
| `POST` | `/accounting/journal-entries/:id/post` | Post a journal entry | Yes | — |
| `POST` | `/accounting/journal-entries/:id/cancel` | Cancel a journal entry | Yes | — |

### Accounting — Fiscal Years

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `GET` | `/accounting/fiscal-years` | List fiscal years | Yes | — |
| `POST` | `/accounting/fiscal-years` | Create a new fiscal year | Yes | — |
| `POST` | `/accounting/fiscal-years/:id/close` | Close a fiscal year | Yes | — |

### Accounting — Financial Reports

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `GET` | `/accounting/trial-balance` | Generate trial balance | Yes | — |
| `GET` | `/accounting/profit-loss` | Generate profit & loss statement | Yes | — |
| `GET` | `/accounting/balance-sheet` | Generate balance sheet | Yes | — |

### Currency

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `GET` | `/currencies` | List all active currencies | Yes | — |
| `POST` | `/currencies` | Create a new currency | Yes | — |
| `GET` | `/exchange-rates` | List exchange rates (filterable) | Yes | — |
| `POST` | `/exchange-rates` | Create/update exchange rate | Yes | — |
| `GET` | `/exchange-rates/convert` | Convert amount between currencies | Yes | — |

### Legal

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `GET` | `/legal/countries` | List all countries | Yes | — |
| `POST` | `/legal/countries` | Create a new country | Yes | — |
| `GET` | `/legal/tax-rates` | List tax rates | Yes | — |
| `POST` | `/legal/tax-rates` | Create a new tax rate | Yes | — |
| `PATCH` | `/legal/tax-rates/:id` | Update a tax rate | Yes | — |
| `DELETE` | `/legal/tax-rates/:id` | Deactivate a tax rate | Yes | — |

### Reporting

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `GET` | `/reports/dashboard` | Main dashboard KPIs | Yes | — |
| `GET` | `/reports/sales` | Sales report (by period, product, customer) | Yes | — |
| `GET` | `/reports/purchases` | Purchase report | Yes | — |
| `GET` | `/reports/inventory` | Inventory report (valuation, movements) | Yes | — |
| `GET` | `/reports/receivables` | Accounts receivable aging | Yes | — |
| `GET` | `/reports/payables` | Accounts payable aging | Yes | — |
| `GET` | `/reports/revenue` | Revenue by period | Yes | — |

### Audit Logs

| Method | Path | Description | Auth | Permissions |
|---|---|---|---|---|
| `GET` | `/audit-logs` | List audit logs (paginated, filterable) | Yes | Role: Admin |

---

## Response Examples

### Login Response

**Request:**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "clx1abc2d0000user123456",
      "email": "admin@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "tenantId": "clx1abc2d0000tenant12345",
      "role": {
        "id": "clx1abc2d0000role123456",
        "name": "Admin"
      }
    }
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "path": "/auth/login",
    "statusCode": 200
  }
}
```

### Paginated List Response

**Request:**
```http
GET /sales/quotations?page=1&limit=2&sortBy=createdAt&sortOrder=desc
Authorization: Bearer eyJhbGci...
X-Tenant-Id: clx1abc2d0000tenant12345
```

**Response (200):**
```json
{
  "data": {
    "items": [
      {
        "id": "clx1abc2d0000quot123456",
        "number": "QUO-00042",
        "date": "2025-01-15T00:00:00.000Z",
        "validUntil": "2025-02-15T00:00:00.000Z",
        "status": "SENT",
        "currencyCode": "USD",
        "exchangeRate": "1.0000",
        "subtotal": "5000.0000",
        "taxTotal": "1000.0000",
        "discountTotal": "0.0000",
        "total": "6000.0000",
        "contact": {
          "id": "clx1abc2d0000cont123456",
          "name": "Acme Corporation",
          "code": "CUST-001"
        },
        "createdAt": "2025-01-15T10:30:00.000Z"
      },
      {
        "id": "clx1abc2d0000quot789012",
        "number": "QUO-00041",
        "date": "2025-01-14T00:00:00.000Z",
        "status": "DRAFT",
        "currencyCode": "EUR",
        "exchangeRate": "1.0850",
        "subtotal": "3200.0000",
        "taxTotal": "640.0000",
        "discountTotal": "160.0000",
        "total": "3680.0000",
        "contact": {
          "id": "clx1abc2d0000cont789012",
          "name": "Beta Industries",
          "code": "CUST-002"
        },
        "createdAt": "2025-01-14T09:15:00.000Z"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 2,
    "totalPages": 21
  },
  "meta": {
    "timestamp": "2025-01-15T10:35:00.000Z",
    "path": "/sales/quotations",
    "statusCode": 200
  }
}
```

### Create Resource Response

**Request:**
```http
POST /contacts
Authorization: Bearer eyJhbGci...
X-Tenant-Id: clx1abc2d0000tenant12345
Content-Type: application/json

{
  "type": "CUSTOMER",
  "code": "CUST-003",
  "name": "Gamma Solutions",
  "email": "billing@gamma.com",
  "phone": "+1-555-0123",
  "taxId": "US-12-3456789",
  "paymentTermDays": 30,
  "creditLimit": 50000,
  "billingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US"
  }
}
```

**Response (201):**
```json
{
  "data": {
    "id": "clx1abc2d0000cont345678",
    "type": "CUSTOMER",
    "code": "CUST-003",
    "name": "Gamma Solutions",
    "email": "billing@gamma.com",
    "phone": "+1-555-0123",
    "taxId": "US-12-3456789",
    "paymentTermDays": 30,
    "creditLimit": "50000.0000",
    "billingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "US"
    },
    "shippingAddress": null,
    "isActive": true,
    "tenantId": "clx1abc2d0000tenant12345",
    "createdAt": "2025-01-15T10:40:00.000Z",
    "updatedAt": "2025-01-15T10:40:00.000Z"
  },
  "meta": {
    "timestamp": "2025-01-15T10:40:00.000Z",
    "path": "/contacts",
    "statusCode": 201
  }
}
```

### Error Responses

**Validation Error (400):**
```json
{
  "statusCode": 400,
  "message": [
    "type must be one of the following values: CUSTOMER, SUPPLIER, BOTH",
    "code should not be empty",
    "name should not be empty"
  ],
  "error": "Bad Request",
  "path": "/contacts",
  "timestamp": "2025-01-15T10:45:00.000Z"
}
```

**Authentication Error (401):**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized",
  "path": "/auth/login",
  "timestamp": "2025-01-15T10:45:00.000Z"
}
```

**Tenant Mismatch (403):**
```json
{
  "statusCode": 403,
  "message": "Tenant mismatch: you do not have access to this tenant",
  "error": "Forbidden",
  "path": "/sales/quotations",
  "timestamp": "2025-01-15T10:45:00.000Z"
}
```

**Not Found (404):**
```json
{
  "statusCode": 404,
  "message": "Quotation not found",
  "error": "Not Found",
  "path": "/sales/quotations/nonexistent-id",
  "timestamp": "2025-01-15T10:45:00.000Z"
}
```

**Conflict (409):**
```json
{
  "statusCode": 409,
  "message": "A contact with code CUST-003 already exists",
  "error": "Conflict",
  "path": "/contacts",
  "timestamp": "2025-01-15T10:45:00.000Z"
}
```

**Business Rule Violation (422):**
```json
{
  "statusCode": 422,
  "message": "Cannot update quotation: status must be DRAFT",
  "error": "Unprocessable Entity",
  "path": "/sales/quotations/clx1abc2d0000quot123456",
  "timestamp": "2025-01-15T10:45:00.000Z"
}
```
