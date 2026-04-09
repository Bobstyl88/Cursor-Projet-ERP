# Data Model

> Entity relationships, business flows, and data design documentation.

---

## Table of Contents

- [Entity Relationship Overview](#entity-relationship-overview)
- [Core Entities](#core-entities)
- [Business Flow: Quote-to-Cash](#business-flow-quote-to-cash)
- [Business Flow: Procure-to-Pay](#business-flow-procure-to-pay)
- [Multi-Currency Handling](#multi-currency-handling)
- [Accounting Double-Entry](#accounting-double-entry)
- [Enums Reference](#enums-reference)

---

## Entity Relationship Overview

```
                            ┌──────────┐
                            │  Tenant  │
                            └────┬─────┘
                 ┌───────┬───────┼───────┬───────┬────────┐
                 ▼       ▼       ▼       ▼       ▼        ▼
              ┌──────┐┌──────┐┌───────┐┌───────┐┌──────┐┌──────────┐
              │ User ││ Role ││Contact││Product││ Tax  ││ Exchange │
              └──┬───┘└──┬───┘└───┬───┘└───┬───┘│ Rate ││   Rate   │
                 │       │        │        │    └──────┘└──────────┘
                 │    ┌──┴──┐     │        │
                 │    │Perms│     │    ┌───┴────┐
                 │    └─────┘     │    │Warehouse│
                 │                │    └───┬────┘
                 │                │        │
              ┌──┴───┐     ┌─────┴────┐  ┌┴──────────┐
              │Audit │     │Quotation │  │StockLevel │
              │ Log  │     │  + Lines │  │StockMove  │
              └──────┘     └────┬─────┘  └───────────┘
                                │
                           ┌────┴─────┐
                           │SaleOrder │
                           │  + Lines │
                           └────┬─────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
             ┌──────────┐           ┌──────────────┐
             │ Invoice  │           │PurchaseOrder │
             │  + Lines │           │   + Lines    │
             └────┬─────┘           └──────────────┘
                  │
             ┌────┴─────┐
             │ Payment  │
             └────┬─────┘
                  │
        ┌────────┴────────┐
        ▼                 ▼
  ┌────────────┐   ┌────────────┐
  │JournalEntry│   │FiscalYear  │
  │  + Lines   │   └────────────┘
  └──────┬─────┘
         │
  ┌──────┴──────┐
  │  Account    │
  │  Category   │
  │  (tree)     │
  └─────────────┘
```

All business entities (except `Currency`, `Country`, and `Permission`) include a `tenantId` foreign key that references the `Tenant` table.

---

## Core Entities

### Tenant & Identity

| Entity | Key Fields | Description |
|---|---|---|
| **Tenant** | `id`, `name`, `slug`, `plan`, `settings`, `isActive` | Root entity for multi-tenancy. Subscription plans: FREE, STARTER, PROFESSIONAL, ENTERPRISE. |
| **User** | `id`, `email`, `firstName`, `lastName`, `tenantId`, `roleId` | Belongs to exactly one tenant. Linked to one role. Supports soft deletion. |
| **Role** | `id`, `name`, `tenantId`, `isSystem` | Tenant-scoped roles. System roles are pre-created and protected from deletion. |
| **Permission** | `id`, `resource`, `action` | Global permission definitions. Actions: CREATE, READ, UPDATE, DELETE, EXPORT, APPROVE. |
| **RolePermission** | `roleId`, `permissionId` | Join table linking roles to permissions (many-to-many). |
| **AuditLog** | `id`, `action`, `resource`, `resourceId`, `oldData`, `newData`, `userId`, `tenantId` | Immutable audit trail of all write operations. |

### Business Entities

| Entity | Key Fields | Description |
|---|---|---|
| **Contact** | `id`, `type`, `code`, `name`, `email`, `taxId`, `creditLimit`, `paymentTermDays` | Unified customer/supplier registry. Types: CUSTOMER, SUPPLIER, BOTH. |
| **Product** | `id`, `code`, `name`, `type`, `purchasePrice`, `salePrice`, `taxRate`, `trackInventory` | Product catalog. Types: GOODS, SERVICE. |
| **Warehouse** | `id`, `code`, `name`, `address`, `isDefault` | Physical or logical storage locations. |
| **StockLevel** | `id`, `warehouseId`, `productId`, `quantity`, `reservedQuantity` | Current stock per product per warehouse. Unique on (tenant, warehouse, product). |
| **StockMovement** | `id`, `type`, `warehouseId`, `productId`, `quantity`, `reference` | Historical record of every stock change. Types: IN, OUT, TRANSFER, ADJUSTMENT. |

### Sales Entities

| Entity | Key Fields | Description |
|---|---|---|
| **Quotation** | `id`, `number`, `contactId`, `status`, `currencyCode`, `exchangeRate`, `subtotal`, `taxTotal`, `total` | Sales quotation with full lifecycle. Statuses: DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED, CONVERTED. |
| **QuotationLine** | `id`, `quotationId`, `productId`, `quantity`, `unitPrice`, `discountPercent`, `taxRate`, `lineTotal` | Individual line items on a quotation. |
| **SaleOrder** | `id`, `number`, `contactId`, `status`, `currencyCode`, `exchangeRate`, `subtotal`, `taxTotal`, `total` | Confirmed sales commitment. Can be created from a quotation. Statuses: DRAFT, CONFIRMED, PARTIALLY_SHIPPED, SHIPPED, PARTIALLY_INVOICED, INVOICED, CANCELLED. |
| **SaleOrderLine** | `id`, `saleOrderId`, `productId`, `quantity`, `deliveredQuantity`, `invoicedQuantity`, `unitPrice` | Line items with delivery and invoicing tracking. |

### Purchasing Entities

| Entity | Key Fields | Description |
|---|---|---|
| **PurchaseOrder** | `id`, `number`, `contactId`, `status`, `currencyCode`, `exchangeRate`, `subtotal`, `taxTotal`, `total` | Purchase commitment to a supplier. Statuses: DRAFT, SENT, CONFIRMED, PARTIALLY_RECEIVED, RECEIVED, PARTIALLY_INVOICED, INVOICED, CANCELLED. |
| **PurchaseOrderLine** | `id`, `purchaseOrderId`, `productId`, `quantity`, `receivedQuantity`, `invoicedQuantity`, `unitPrice` | Line items with receipt and invoicing tracking. |

### Invoicing Entities

| Entity | Key Fields | Description |
|---|---|---|
| **Invoice** | `id`, `number`, `type`, `contactId`, `status`, `currencyCode`, `exchangeRate`, `total`, `amountPaid`, `amountDue`, `saleOrderId`, `purchaseOrderId` | Invoices supporting multiple types. Types: SALE, PURCHASE, CREDIT_NOTE, DEBIT_NOTE. Statuses: DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED, VOID. |
| **InvoiceLine** | `id`, `invoiceId`, `productId`, `quantity`, `unitPrice`, `discountPercent`, `taxRate`, `lineTotal` | Individual line items on an invoice. |
| **Payment** | `id`, `invoiceId`, `date`, `amount`, `currencyCode`, `exchangeRate`, `method`, `reference` | Payment records against invoices. Methods: CASH, BANK_TRANSFER, CHECK, CREDIT_CARD, OTHER. |

### Accounting Entities

| Entity | Key Fields | Description |
|---|---|---|
| **FiscalYear** | `id`, `name`, `startDate`, `endDate`, `status` | Accounting period. Statuses: OPEN, CLOSED. Journal entries reference a fiscal year. |
| **AccountCategory** | `id`, `code`, `name`, `type`, `parentId`, `isSystem` | Hierarchical chart of accounts (tree via self-referential `parentId`). Types: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE. |
| **JournalEntry** | `id`, `number`, `date`, `status`, `sourceType`, `sourceId`, `totalDebit`, `totalCredit`, `fiscalYearId` | Double-entry bookkeeping record. Statuses: DRAFT, POSTED, CANCELLED. `sourceType`/`sourceId` link back to the originating document (e.g., Invoice, Payment). |
| **JournalEntryLine** | `id`, `journalEntryId`, `accountId`, `debit`, `credit`, `currencyCode`, `exchangeRate`, `amountInCurrency` | Individual debit or credit line within a journal entry. |

### Legal & Configuration Entities

| Entity | Key Fields | Description |
|---|---|---|
| **Currency** | `id`, `code`, `name`, `symbol`, `decimalPlaces` | Global currency registry (not tenant-scoped). |
| **ExchangeRate** | `id`, `baseCurrencyCode`, `targetCurrencyCode`, `rate`, `date`, `tenantId` | Tenant-specific exchange rates by date. Unique on (tenant, base, target, date). |
| **TaxRate** | `id`, `name`, `code`, `rate`, `type`, `country`, `isDefault`, `tenantId` | Configurable tax rates. Types: VAT, SALES_TAX, GST, CUSTOM. |
| **Country** | `id`, `code`, `name`, `currencyCode`, `taxLabel` | Global country registry (not tenant-scoped). |
| **Sequence** | `id`, `prefix`, `currentValue`, `padding`, `tenantId` | Auto-incrementing number sequences for document numbering (e.g., INV-00001, QUO-00042). |

---

## Business Flow: Quote-to-Cash

This is the complete sales lifecycle from initial quotation to cash received, with all entity state changes documented.

### Step 1: Create Quotation

```
POST /sales/quotations
```

**Entity changes:**
- `Quotation` created with `status: DRAFT`
- `QuotationLine[]` created for each product
- Line totals calculated: `lineTotal = quantity × unitPrice × (1 - discountPercent/100) × (1 + taxRate/100)`
- Document totals calculated: `subtotal`, `taxTotal`, `discountTotal`, `total`
- Document number auto-generated via `Sequence` (e.g., `QUO-00042`)

### Step 2: Send Quotation

```
POST /sales/quotations/:id/send
```

**Entity changes:**
- `Quotation.status`: `DRAFT` → `SENT`

The quotation is now visible to the customer. No other entity changes.

### Step 3: Accept Quotation

```
POST /sales/quotations/:id/accept
```

**Entity changes:**
- `Quotation.status`: `SENT` → `ACCEPTED`

The customer has agreed to the terms. The quotation is now eligible for conversion.

### Step 4: Convert to Sale Order

```
POST /sales/quotations/:id/convert
```

**Entity changes:**
- `Quotation.status`: `ACCEPTED` → `CONVERTED`
- `Quotation.convertedToOrderId`: set to the new sale order ID
- `SaleOrder` created with `status: DRAFT`
  - Copies `contactId`, `currencyCode`, `exchangeRate`, all totals
  - References `quotationId` for traceability
- `SaleOrderLine[]` created from `QuotationLine[]`
  - Copies `productId`, `quantity`, `unitPrice`, `discountPercent`, `taxRate`, `lineTotal`
  - `deliveredQuantity: 0`, `invoicedQuantity: 0`

### Step 5: Confirm Sale Order

```
POST /sales/orders/:id/confirm
```

**Entity changes:**
- `SaleOrder.status`: `DRAFT` → `CONFIRMED`

The sale is now committed. Stock may be reserved (if implemented).

### Step 6: Create Invoice from Sale Order

```
POST /invoices
{ type: "SALE", saleOrderId: "..." }
```

**Entity changes:**
- `Invoice` created with `type: SALE`, `status: DRAFT`
  - References `saleOrderId` and `contactId`
  - Copies currency info, calculates totals from lines
  - `amountPaid: 0`, `amountDue: total`
- `InvoiceLine[]` created from `SaleOrderLine[]`
- `SaleOrder.status` may update to `PARTIALLY_INVOICED` or `INVOICED`
- `SaleOrderLine.invoicedQuantity` updated

### Step 7: Send Invoice

```
POST /invoices/:id/send
```

**Entity changes:**
- `Invoice.status`: `DRAFT` → `SENT`
- BullMQ job enqueued: `accounting-sync` → `create-invoice-journal`

**Async (via AccountingProcessor):**
- `JournalEntry` created with `status: DRAFT`, auto-posted to `POSTED`
  - `sourceType: 'Invoice'`, `sourceId: invoice.id`
- `JournalEntryLine[]`:
  - **Debit**: Accounts Receivable → `invoice.total`
  - **Credit**: Revenue → `invoice.subtotal`
  - **Credit**: Tax Payable → `invoice.taxTotal`
- `JournalEntry.totalDebit === JournalEntry.totalCredit` (balanced)

### Step 8: Record Payment

```
POST /invoices/:id/payments
{ date: "...", amount: 6000, method: "BANK_TRANSFER", reference: "TXN-123" }
```

**Entity changes:**
- `Payment` created with amount, method, currency info
- `Invoice.amountPaid` incremented by payment amount
- `Invoice.amountDue` decremented by payment amount
- `Invoice.status` updated:
  - If `amountDue > 0`: `PARTIALLY_PAID`
  - If `amountDue === 0`: `PAID`
- BullMQ job enqueued: `accounting-sync` → `create-payment-journal`

**Async (via AccountingProcessor):**
- `JournalEntry` created:
  - **Debit**: Bank/Cash Account → payment amount
  - **Credit**: Accounts Receivable → payment amount

### Summary: Entity State Transitions

```
Quotation:  DRAFT → SENT → ACCEPTED → CONVERTED
SaleOrder:  DRAFT → CONFIRMED → PARTIALLY_INVOICED → INVOICED
Invoice:    DRAFT → SENT → PARTIALLY_PAID → PAID
JournalEntry: DRAFT → POSTED (auto)
```

---

## Business Flow: Procure-to-Pay

The complete purchasing lifecycle from order to payment.

### Step 1: Create Purchase Order

```
POST /purchasing/orders
```

**Entity changes:**
- `PurchaseOrder` created with `status: DRAFT`
- `PurchaseOrderLine[]` created for each product
- Totals calculated, number auto-generated (e.g., `PO-00015`)

### Step 2: Send to Supplier

```
POST /purchasing/orders/:id/send
```

**Entity changes:**
- `PurchaseOrder.status`: `DRAFT` → `SENT`

### Step 3: Confirm Purchase Order

```
POST /purchasing/orders/:id/confirm
```

**Entity changes:**
- `PurchaseOrder.status`: `SENT` → `CONFIRMED`

### Step 4: Receive Goods

```
POST /purchasing/orders/:id/receive
{ lines: [{ lineId: "...", receivedQuantity: 50, warehouseId: "..." }] }
```

**Entity changes:**
- `PurchaseOrderLine.receivedQuantity` incremented
- `PurchaseOrder.status` updated:
  - If all lines fully received: `RECEIVED`
  - If some lines partially received: `PARTIALLY_RECEIVED`
- BullMQ job enqueued: `stock-update` → `update-stock` (type: `IN`)

**Async (via StockProcessor):**
- `StockLevel.quantity` incremented (or created if first stock for this product/warehouse)
- `StockMovement` created with `type: IN`, references the PO
- Low stock check: if `quantity < product.minStock`, alert is logged

### Step 5: Create Purchase Invoice

```
POST /invoices
{ type: "PURCHASE", purchaseOrderId: "..." }
```

**Entity changes:**
- `Invoice` created with `type: PURCHASE`, `status: DRAFT`
- `InvoiceLine[]` created from `PurchaseOrderLine[]`
- `PurchaseOrder.status` may update to `PARTIALLY_INVOICED` or `INVOICED`

### Step 6: Record Payment

```
POST /invoices/:id/payments
```

**Entity changes:**
- Same payment flow as sales invoices
- Journal entries:
  - **On invoice**: Debit: Expense/Inventory, Credit: Accounts Payable
  - **On payment**: Debit: Accounts Payable, Credit: Bank/Cash

### Summary: Entity State Transitions

```
PurchaseOrder:  DRAFT → SENT → CONFIRMED → PARTIALLY_RECEIVED → RECEIVED → INVOICED
Invoice:        DRAFT → SENT → PARTIALLY_PAID → PAID
StockLevel:     quantity incremented on goods receipt
JournalEntry:   DRAFT → POSTED (auto)
```

---

## Multi-Currency Handling

### Design Principles

1. **Document currency**: Every financial document (quotation, order, invoice, payment) stores its `currencyCode` and `exchangeRate` at the time of creation
2. **Base currency**: Each tenant has a base currency (configured in tenant settings). Accounting entries are recorded in the base currency
3. **Exchange rate capture**: The exchange rate is frozen on the document at creation time — subsequent rate changes do not affect existing documents
4. **Conversion**: `baseAmount = documentAmount × exchangeRate`

### Data Flow

```
                      ┌─────────────────┐
                      │  Exchange Rate   │
                      │  Table           │
                      │                  │
                      │  USD → EUR: 0.92 │
                      │  USD → GBP: 0.79 │
                      └────────┬─────────┘
                               │ lookup at creation time
                               ▼
┌──────────────────────────────────────────────────────┐
│  Invoice                                             │
│  number: INV-001                                     │
│  currencyCode: EUR                                   │
│  exchangeRate: 1.0850 (EUR per 1 base unit)          │
│  subtotal: 5000.0000 (in EUR)                        │
│  taxTotal: 1000.0000 (in EUR)                        │
│  total: 6000.0000 (in EUR)                           │
└──────────────────────────────────────────────────────┘
                               │
                               ▼ auto-create journal entry
┌──────────────────────────────────────────────────────┐
│  JournalEntryLine                                    │
│  accountId: Accounts Receivable                      │
│  debit: 5529.95 (converted to base currency)         │
│  currencyCode: EUR                                   │
│  exchangeRate: 1.0850                                │
│  amountInCurrency: 6000.0000 (original EUR amount)   │
└──────────────────────────────────────────────────────┘
```

### Currency Conversion API

The `/exchange-rates/convert` endpoint provides real-time conversion:

```
GET /exchange-rates/convert?from=EUR&to=USD&amount=1000&date=2025-01-15
```

Returns the converted amount using the exchange rate for the specified date.

### Decimal Precision

All monetary fields use `Decimal(18, 4)` in PostgreSQL, providing:
- Up to 14 digits before the decimal point (trillions)
- 4 decimal places for sub-cent precision (important for exchange rates and unit prices)

---

## Accounting Double-Entry

### Fundamental Rule

Every journal entry must satisfy: **Total Debits = Total Credits**

This is enforced at the service level when creating or posting journal entries. The `JournalEntry` model stores `totalDebit` and `totalCredit` for quick validation.

### Chart of Accounts Structure

The chart of accounts uses a hierarchical tree via the `parentId` self-reference:

```
ASSET (1000-1999)
├── 1000 Cash and Bank
│   ├── 1001 Cash on Hand
│   └── 1010 Bank Account
├── 1100 Accounts Receivable
│   └── 1100 Trade Receivables
└── 1200 Inventory
    └── 1200 Goods in Stock

LIABILITY (2000-2999)
├── 2000 Accounts Payable
│   └── 2000 Trade Payables
└── 2100 Tax Payable
    ├── 2100 VAT Payable
    └── 2110 Sales Tax Payable

EQUITY (3000-3999)
├── 3000 Share Capital
└── 3100 Retained Earnings

REVENUE (4000-4999)
├── 4000 Sales Revenue
│   ├── 4000 Product Revenue
│   └── 4100 Service Revenue
└── 4200 Other Income

EXPENSE (5000-5999)
├── 5000 Cost of Goods Sold
├── 5100 Operating Expenses
└── 5200 Administrative Expenses
```

### Auto-Generated Journal Entries

#### Sale Invoice Journal Entry

When a sale invoice is sent, the system auto-creates:

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Accounts Receivable (1100) | 6,000.00 | |
| 2 | Sales Revenue (4000) | | 5,000.00 |
| 3 | Tax Payable (2100) | | 1,000.00 |
| **Total** | | **6,000.00** | **6,000.00** |

#### Payment Received Journal Entry

When a payment is recorded against a sale invoice:

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Bank Account (1010) | 6,000.00 | |
| 2 | Accounts Receivable (1100) | | 6,000.00 |
| **Total** | | **6,000.00** | **6,000.00** |

#### Purchase Invoice Journal Entry

When a purchase invoice is sent:

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Expense / Inventory (5000) | 3,200.00 | |
| 2 | Input Tax (ASSET or offset) | 640.00 | |
| 3 | Accounts Payable (2000) | | 3,840.00 |
| **Total** | | **3,840.00** | **3,840.00** |

#### Supplier Payment Journal Entry

When a payment is made to a supplier:

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Accounts Payable (2000) | 3,840.00 | |
| 2 | Bank Account (1010) | | 3,840.00 |
| **Total** | | **3,840.00** | **3,840.00** |

### Financial Reports

Built from journal entry data:

- **Trial Balance**: Sum of debits and credits per account for a period. Must balance in total.
- **Profit & Loss**: Revenue accounts minus expense accounts for a period.
- **Balance Sheet**: Assets = Liabilities + Equity at a point in time.

---

## Enums Reference

### Plan
| Value | Description |
|---|---|
| `FREE` | Free tier |
| `STARTER` | Basic paid tier |
| `PROFESSIONAL` | Mid-range tier |
| `ENTERPRISE` | Full-feature tier |

### Action (Permissions)
| Value | Description |
|---|---|
| `CREATE` | Create new resources |
| `READ` | View resources |
| `UPDATE` | Modify existing resources |
| `DELETE` | Remove resources |
| `EXPORT` | Export data (CSV, PDF) |
| `APPROVE` | Approve workflows |

### ContactType
| Value | Description |
|---|---|
| `CUSTOMER` | Buyer of goods/services |
| `SUPPLIER` | Vendor of goods/services |
| `BOTH` | Acts as both customer and supplier |

### ProductType
| Value | Description |
|---|---|
| `GOODS` | Physical product (trackable inventory) |
| `SERVICE` | Non-physical service |

### StockMovementType
| Value | Description |
|---|---|
| `IN` | Stock received into warehouse |
| `OUT` | Stock shipped from warehouse |
| `TRANSFER` | Stock moved between warehouses |
| `ADJUSTMENT` | Manual stock correction |

### QuotationStatus
| Value | Transitions To |
|---|---|
| `DRAFT` | SENT |
| `SENT` | ACCEPTED, REJECTED, EXPIRED |
| `ACCEPTED` | CONVERTED |
| `REJECTED` | (terminal) |
| `EXPIRED` | (terminal) |
| `CONVERTED` | (terminal) |

### SaleOrderStatus
| Value | Transitions To |
|---|---|
| `DRAFT` | CONFIRMED, CANCELLED |
| `CONFIRMED` | PARTIALLY_SHIPPED, PARTIALLY_INVOICED |
| `PARTIALLY_SHIPPED` | SHIPPED |
| `SHIPPED` | PARTIALLY_INVOICED, INVOICED |
| `PARTIALLY_INVOICED` | INVOICED |
| `INVOICED` | (terminal) |
| `CANCELLED` | (terminal) |

### PurchaseOrderStatus
| Value | Transitions To |
|---|---|
| `DRAFT` | SENT, CANCELLED |
| `SENT` | CONFIRMED |
| `CONFIRMED` | PARTIALLY_RECEIVED |
| `PARTIALLY_RECEIVED` | RECEIVED |
| `RECEIVED` | PARTIALLY_INVOICED, INVOICED |
| `PARTIALLY_INVOICED` | INVOICED |
| `INVOICED` | (terminal) |
| `CANCELLED` | (terminal) |

### InvoiceType
| Value | Description |
|---|---|
| `SALE` | Invoice to a customer |
| `PURCHASE` | Invoice from a supplier |
| `CREDIT_NOTE` | Reduction to a sale invoice |
| `DEBIT_NOTE` | Reduction to a purchase invoice |

### InvoiceStatus
| Value | Transitions To |
|---|---|
| `DRAFT` | SENT, CANCELLED |
| `SENT` | PARTIALLY_PAID, PAID, OVERDUE, VOID |
| `PARTIALLY_PAID` | PAID, OVERDUE |
| `PAID` | (terminal) |
| `OVERDUE` | PARTIALLY_PAID, PAID |
| `CANCELLED` | (terminal) |
| `VOID` | (terminal) |

### PaymentMethod
| Value | Description |
|---|---|
| `CASH` | Cash payment |
| `BANK_TRANSFER` | Wire/bank transfer |
| `CHECK` | Check/cheque |
| `CREDIT_CARD` | Credit card payment |
| `OTHER` | Other payment method |

### AccountType
| Value | Normal Balance | Description |
|---|---|---|
| `ASSET` | Debit | Resources owned (cash, receivables, inventory) |
| `LIABILITY` | Credit | Obligations owed (payables, loans, tax) |
| `EQUITY` | Credit | Owner's stake (capital, retained earnings) |
| `REVENUE` | Credit | Income earned (sales, services) |
| `EXPENSE` | Debit | Costs incurred (COGS, salaries, rent) |

### JournalEntryStatus
| Value | Description |
|---|---|
| `DRAFT` | Entry created but not finalized |
| `POSTED` | Entry finalized and affects account balances |
| `CANCELLED` | Entry reversed/voided |

### TaxType
| Value | Description |
|---|---|
| `VAT` | Value Added Tax (EU, UK) |
| `SALES_TAX` | Sales tax (US) |
| `GST` | Goods & Services Tax (AU, IN, CA) |
| `CUSTOM` | Custom tax type |

### FiscalYearStatus
| Value | Description |
|---|---|
| `OPEN` | Active fiscal year accepting journal entries |
| `CLOSED` | Closed fiscal year — no new entries allowed |
