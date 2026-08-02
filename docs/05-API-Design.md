# API Design (Nitro server routes)

Convention: REST-ish, resource-based, JSON. Write the OpenAPI spec (`openapi.yaml`) alongside these routes
as you build them — even solo, having a machine-readable contract means you can generate a typed client
and catch drift automatically (`nuxt-open-fetch` or similar).

## Auth
```
POST   /api/auth/login          { email, password } → session cookie
POST   /api/auth/logout
GET    /api/auth/me             → current user + role
```

## Sales
```
GET    /api/sales               ?from=&to=&customerId=&status=
POST   /api/sales                { customerId?, items: [{productId, qty, costPrice, sellingPrice}], paymentMode }
GET    /api/sales/:id
```

## Purchases
```
GET    /api/purchases
POST   /api/purchases            { supplierId, items: [...], paymentMode }
GET    /api/purchases/:id
```

## Inventory
```
GET    /api/products             ?lowStock=true
POST   /api/products             { name, category, unit, reorderLevel }
GET    /api/products/:id/movements
POST   /api/products/:id/adjust  { quantity, reason }   -- manual stock adjustment, still ledger-safe
```

## Expenses
```
GET    /api/expenses             ?from=&to=&category=
POST   /api/expenses             { category, description, vendor, amount, paymentMode }
```

## Customers / Suppliers
```
GET    /api/customers
POST   /api/customers
GET    /api/customers/:id/ledger  → transactions + running balance
GET    /api/suppliers
POST   /api/suppliers
GET    /api/suppliers/:id/ledger
```

## Cash Book
```
GET    /api/cash-txns            ?from=&to=&category=
POST   /api/cash-txns             { particulars, category, receipt|payment, paymentMode }
```

## Reports (read-only, computed)
```
GET    /api/reports/trial-balance     ?asOf=
GET    /api/reports/profit-and-loss   ?from=&to=
GET    /api/reports/balance-sheet     ?asOf=
GET    /api/reports/cash-flow         ?from=&to=
GET    /api/reports/dashboard-summary
```

## Conventions

- **Pagination**: `?page=&pageSize=` on all list endpoints, default pageSize 50, response includes `total`.
- **Dates**: ISO 8601 strings (`YYYY-MM-DD`) in requests and responses; store as `date`/`timestamptz` in
  Postgres, never as text.
- **Money**: always `numeric`/decimal on the wire as a string or fixed-precision number — never IEEE
  float. This matters more than almost anything else in a financial app; a float-precision bug is exactly
  the kind of silent, hard-to-trace error the Excel file suffered from.
- **Errors**: `{ error: { code: string, message: string, details?: unknown } }`, consistent HTTP status
  codes (400 validation, 401 auth, 403 role, 404 not found, 409 conflict, 500 unexpected).
- **Auth**: every route except `/api/auth/login` requires a valid session; role checks happen in
  middleware, not scattered inside handlers.
