# Database Schema / ERD

Design principle: the **general ledger is the single source of truth** for anything financial. The
registers (Sales, Purchases, Expenses, Cash Book) are the *documents* that generate ledger entries; the
reports (P&L, Balance Sheet, Trial Balance, Cash Flow) are *views computed from* the ledger, never
separately maintained tables. This is the direct fix for the Excel reconciliation problem.

## 1. Core / Auth

```
users
  id            uuid PK
  name          text
  email         text UNIQUE NOT NULL
  password_hash text NOT NULL
  role          enum('owner','staff','accountant_readonly') NOT NULL DEFAULT 'staff'
  created_at    timestamptz NOT NULL DEFAULT now()
  is_active     boolean NOT NULL DEFAULT true

business_profile          -- single row for Phase 1 (not tenant-scoped)
  id            uuid PK
  business_name text
  financial_year_start date
  financial_year_end   date
  gst_registered boolean NOT NULL DEFAULT false
  gstin         text NULL
  address       text
```

## 2. Chart of Accounts + Ledger (the core, append-only)

```
accounts                          -- Chart of Accounts
  id            uuid PK
  code          text UNIQUE NOT NULL      -- e.g. 'CASH', 'DEBTORS', 'SALES-REV', 'COGS'
  name          text NOT NULL
  type          enum('asset','liability','equity','income','expense') NOT NULL
  parent_id     uuid NULL REFERENCES accounts(id)   -- optional hierarchy (e.g. Expense > Utilities)

ledger_entries                    -- APPEND-ONLY. Never UPDATE or DELETE a posted row.
  id              uuid PK
  entry_date      date NOT NULL
  account_id      uuid NOT NULL REFERENCES accounts(id)
  debit           numeric(12,2) NOT NULL DEFAULT 0
  credit          numeric(12,2) NOT NULL DEFAULT 0
  description     text
  reference_type  enum('sale','purchase','expense','cash_txn','journal','opening_balance','reversal')
  reference_id    uuid            -- FK to the source document (sales.id, purchases.id, ...)
  customer_id     uuid NULL REFERENCES customers(id)   -- populated only for Debtor-account rows
  supplier_id     uuid NULL REFERENCES suppliers(id)   -- populated only for Creditor-account rows
  reverses_entry_id uuid NULL REFERENCES ledger_entries(id)  -- set only on correction entries
  created_by      uuid NOT NULL REFERENCES users(id)
  created_at      timestamptz NOT NULL DEFAULT now()

  CONSTRAINT chk_one_side CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  )
```

Corrections are handled by inserting a `reversal` entry that references the original — never by editing or
deleting a row. This gives you a full audit trail for free and makes "why doesn't this balance" always
answerable by querying, not guessing.

Trial Balance, P&L, Balance Sheet, Cash Flow are all `SELECT`s (or materialized views refreshed on demand)
against `ledger_entries` grouped by `account_id` / `type`. They are **generated, not stored** — see
`05-API-Design.md` for the report endpoints.

## 3. Operational Registers (the "documents")

```
customers
  id            uuid PK
  code          text UNIQUE NOT NULL     -- e.g. CUST-0001, generated, never reused
  name          text NOT NULL
  phone         text
  email         text
  address       text
  credit_limit  numeric(12,2)
  status        enum('active','inactive') DEFAULT 'active'
  created_at    timestamptz DEFAULT now()

suppliers                          -- mirrors customers
  id, code, name, contact_person, phone, address, opening_balance, credit_terms_days, status, created_at

products
  id             uuid PK
  code           text UNIQUE NOT NULL      -- PRO-001 etc, generated
  name           text NOT NULL
  category       text
  unit           text                       -- Kg, Packet, Bottle, Piece...
  reorder_level  numeric(10,2) DEFAULT 0
  cost_price     numeric(12,2)              -- current/latest cost, informational
  selling_price  numeric(12,2)              -- current default, editable per-sale
  created_at     timestamptz DEFAULT now()

inventory_movements                -- append-only stock ledger, mirrors ledger_entries pattern
  id            uuid PK
  product_id    uuid NOT NULL REFERENCES products(id)
  movement_date date NOT NULL
  type          enum('opening','purchase','sale','damage','adjustment')
  quantity      numeric(10,2) NOT NULL     -- positive = stock in, negative = stock out
  reference_type enum('sale','purchase','manual')
  reference_id  uuid
  created_by    uuid REFERENCES users(id)
  created_at    timestamptz DEFAULT now()
  -- current stock = SUM(quantity) per product; never store a "closing stock" column that can drift

sales
  id            uuid PK
  invoice_no    text UNIQUE NOT NULL
  sale_date     date NOT NULL
  customer_id   uuid NULL REFERENCES customers(id)     -- null = walk-in/cash customer
  payment_mode  enum('cash','upi','credit')
  status        enum('paid','pending') NOT NULL
  created_by    uuid REFERENCES users(id)
  created_at    timestamptz DEFAULT now()

sale_items
  id            uuid PK
  sale_id       uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE
  product_id    uuid NOT NULL REFERENCES products(id)
  quantity      numeric(10,2) NOT NULL
  cost_price    numeric(12,2) NOT NULL      -- snapshot at time of sale, not a live FK to products.cost_price
  selling_price numeric(12,2) NOT NULL      -- snapshot at time of sale

purchases / purchase_items          -- mirrors sales / sale_items, supplier_id instead of customer_id

expenses
  id            uuid PK
  expense_no    text UNIQUE NOT NULL
  expense_date  date NOT NULL
  category      text NOT NULL
  description   text
  vendor        text
  amount        numeric(12,2) NOT NULL
  payment_mode  enum('cash','upi','other')
  department    text
  created_by    uuid REFERENCES users(id)
  created_at    timestamptz DEFAULT now()

cash_txns                          -- the Cash Book, still useful as a human-readable receipts/payments view
  id            uuid PK
  txn_date      date NOT NULL
  voucher_no    text UNIQUE NOT NULL
  particulars   text
  account_head  text                       -- derived/display label, not authoritative
  category      enum('capital','sales','expense','drawings','purchase','other')
  receipt       numeric(12,2) DEFAULT 0
  payment       numeric(12,2) DEFAULT 0
  payment_mode  text
  reference_no  text
  created_by    uuid REFERENCES users(id)
  created_at    timestamptz DEFAULT now()
```

**Important:** `sale_items.cost_price` / `selling_price` are **snapshots**, not live lookups against
`products`. This is why: if today's cost price changes, last month's Gross Profit report must not silently
change too. This is a common real bug — don't let a report's historical numbers move because someone
edited a master record.

## 4. Why snapshot vs. live-reference, generally

Anywhere a report depends on "the price/rate/balance at the time," store the value at write time. Anywhere
a report depends on "the current state," compute it live from the append-only tables. Mixing these up is
exactly how the old Inventory Register's Excel formulas referenced the wrong rows and produced numbers
nobody trusted.

## 5. Indexes to add on day one

```sql
CREATE INDEX ON ledger_entries (account_id, entry_date);
CREATE INDEX ON ledger_entries (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX ON ledger_entries (supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX ON inventory_movements (product_id, movement_date);
CREATE INDEX ON sales (customer_id, sale_date);
CREATE INDEX ON purchases (supplier_id, purchase_date);
```

Trivial at this data volume, but cheap to add now and saves a "why is this report slow" investigation
later.

## 6. Migrations

Use Drizzle Kit from commit #1. Never hand-edit the production schema. Every schema change is a generated,
reviewed, version-controlled migration file — this is non-negotiable for a financial system, even a
single-user one, because you need to be able to answer "what did the schema look like on the date this
report was generated."
