# Low-Level Design (LLD)

## 1. Folder Structure (Nuxt 4 `app/` directory convention)

```
app/
  pages/
    index.vue                    -- Dashboard
    cashbook/index.vue
    sales/index.vue
    sales/[id].vue
    purchases/index.vue
    inventory/index.vue
    expenses/index.vue
    customers/index.vue
    customers/[id].vue           -- customer ledger drill-down
    suppliers/index.vue
    suppliers/[id].vue
    reports/trial-balance.vue
    reports/profit-and-loss.vue
    reports/balance-sheet.vue
    reports/cash-flow.vue
    admin/users.vue
    admin/data-quality.vue
    login.vue
  components/
    ui/                          -- generic (DataTable, KpiCard, FormField...)
    sales/                       -- feature-scoped components
    customers/
  composables/
    useAuth.ts
    useLedger.ts                 -- typed client-side helpers around /api/reports/*
  middleware/
    auth.global.ts               -- redirect unauthenticated users
    role.ts                      -- per-route role guard
server/
  api/
    auth/[...].ts
    sales/index.get.ts
    sales/index.post.ts
    sales/[id].get.ts
    purchases/*
    inventory/*
    expenses/*
    customers/*
    suppliers/*
    reports/trial-balance.get.ts
    reports/profit-and-loss.get.ts
    reports/balance-sheet.get.ts
    reports/cash-flow.get.ts
  services/
    sales.service.ts
    purchases.service.ts
    inventory.service.ts
    ledger.service.ts            -- shared by every service that posts ledger entries
    report.service.ts
    auth.service.ts
  repositories/
    sales.repo.ts
    ledger.repo.ts
    customers.repo.ts
    ...
  db/
    schema.ts
    client.ts
    migrations/
  utils/
    validation/                  -- zod schemas, shared between client + server
```

## 2. Key Sequence: Record a Credit Sale

```
UI (sales/index.vue)
  → submits form → composable calls POST /api/sales
Route handler (server/api/sales/index.post.ts)
  → validates body against zod schema (SaleInput)
  → calls SalesService.recordSale(input, userId)
SalesService.recordSale()
  → db.transaction(async tx => {
        1. insert `sales` row
        2. insert `sale_items` rows (snapshot cost/selling price)
        3. LedgerService.post(tx, [
             { account: 'DEBTORS' or 'CASH', debit: netAmount },
             { account: 'SALES-REV', credit: netAmount },
             { account: 'COGS', debit: totalCost },
             { account: 'INVENTORY', credit: totalCost },
           ], { reference: sale.id, type: 'sale' })
        4. InventoryService.deduct(tx, saleItems)   -- inserts inventory_movements rows
     })
  → on any thrown error, the whole transaction rolls back — no partial state, ever
  → returns the created sale with computed status
Route handler
  → returns 201 with the sale
UI
  → optimistic update or refetch; toast success
```

This is the pattern for **every** write that touches money or stock: purchases, expenses, cash
transactions, manual journal entries. One service method, one DB transaction, ledger + inventory updated
atomically. This is what makes "the Sales Register doesn't match the Cash Book" structurally impossible.

## 3. Key Sequence: Generate the Balance Sheet

```
GET /api/reports/balance-sheet?asOf=2026-07-31
  → ReportService.getBalanceSheet(asOfDate)
      → LedgerRepo.getBalancesByAccountType(asOfDate)
          -- SELECT account_id, SUM(debit) - SUM(credit) ...
          -- GROUP BY account, filtered by entry_date <= asOfDate
      → groups by account.type (asset/liability/equity)
      → returns { assets: [...], liabilities: [...], equity: [...], totalAssets, totalLiabilitiesAndEquity, difference }
  → response is pure computation over ledger_entries — nothing here is a separately stored,
    independently-editable number, so it cannot silently drift from the transactions
```

If `difference !== 0`, the API returns it explicitly rather than hiding it — same principle as the Excel
rebuild: **show a real discrepancy, don't force-balance it.** The difference should always be exactly `0`
here, though, because every write path is transactional — if you ever see a nonzero difference, it means a
write bypassed `LedgerService`, which is a bug to fix immediately, not a data-entry issue to explain away.

## 4. Component Breakdown (representative — not exhaustive)

| Component | Responsibility |
|---|---|
| `KpiCard.vue` | Label + value + optional trend, used on Dashboard |
| `DataTable.vue` | Generic sortable/filterable table, used by every register page |
| `LedgerDrilldown.vue` | Given a customer/supplier id, renders their running-balance ledger |
| `SaleForm.vue` | Multi-line item entry (product picker, qty, price, computed total) |
| `ReportTable.vue` | Renders any of the 4 financial reports from a common shape |

## 5. Validation Strategy

Zod schemas live in `server/utils/validation/` and are imported by **both** the Nitro route handler (server
validation, authoritative) and the client form (for immediate UX feedback) — one schema, no drift between
client and server rules. This is a direct benefit of the single-TypeScript-codebase decision in the HLD.

## 6. Error Handling

- Route handlers throw typed errors (`AppError` with a `code` and `httpStatus`); a single Nitro error
  handler maps them to consistent JSON responses.
- Never swallow a transaction rollback silently — log it with enough context (user, payload, timestamp) to
  reconstruct what was attempted.
