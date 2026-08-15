# Customer and Supplier Master / Ledger Architecture

## Purpose

Customer and supplier data has two separate responsibilities:

| Area | Purpose | Mutability | Source of truth |
| --- | --- | --- | --- |
| Master | Identifies the party and their operating terms | Controlled CRUD | `customers` / `suppliers` |
| Ledger | Records monetary events and the resulting receivable or payable | Append-only | `ledger_entries` |

Do not store a running outstanding balance in a master row. The balance is always calculated from the party-tagged ledger rows. This avoids balance drift.

## Master records

There is exactly one row per customer or supplier, identified by the UUID primary key (`id`) and a human-readable unique code (`CUST-####` or `SUP-####`).

The master holds party identity and operational attributes:

- Customer: name, company, mobile, email, GSTIN, address, city, state, PIN code, credit limit, status, remarks, and assigned user.
- Supplier: name, company, contact person, mobile, email, GSTIN, address, city, state, PIN code, credit terms, credit limit, supplier type, rating, status, and remarks.
- `opening_balance` is recorded when the master is created. It is historical accounting input, not a mutable current balance. A mistake is corrected by reversal, never by changing the field.

Use updates for non-financial master data and status changes. Inactivate a party rather than hard-deleting it after transactions exist, so foreign keys and historical reports remain valid.

## Ledger records

`ledger_entries` is the accounting source of truth and uses double-entry posting. Every business transaction posts balanced debit and credit lines in one database transaction.

- `customer_id` or `supplier_id` links the relevant party ledger line to exactly one master record.
- `entry_date`, debit, credit, particulars (`description`), `reference_type`, `reference_id`, `created_by`, and `created_at` are stored on every row.
- Voucher number, invoice/purchase number, payment mode, reference number, due date, transaction status, salesperson/buyer, remarks, and approver are read from the linked sale or purchase document. This prevents duplicated fields from disagreeing between a document and its ledger view.
- Running balance is calculated in ledger display order (`entry_date`, `created_at`); it is not persisted because persisted running balances become wrong when valid back-dated entries are posted.
- Supporting indexes cover party ledger reads and reversal lookups.

## Correction workflow

1. A user identifies the original business document or ledger reference.
2. The owner provides a correction reason and reversal date.
3. The system creates a new reversal reference and inserts mirror debit/credit entries.
4. Each mirror row sets `reverses_entry_id` to the exact original row it offsets.
5. The system posts the corrected business document as a new transaction when needed.

The database prevents direct `UPDATE` and `DELETE` on `ledger_entries`. It also enforces the reversal foreign key, so a reversal cannot point to a non-existent original row.

The generic reversal endpoint currently supports opening balances only. Sales, purchases, expenses, cash transactions, and inventory-affecting documents require their own transaction-level correction flows so accounting, stock, and source documents are reversed together.

## Access control

- Staff create approved business documents through domain APIs.
- `accountant_readonly` can inspect audit data and reports but cannot change postings.
- Only `owner` can submit a ledger correction request.
- The correction reason is required and stored in the reversal description; both original and reversal remain visible in the audit trail.

## Operational rules

- Never update or delete posted ledger rows.
- Never recalculate balances into a stored master column.
- Never use a generic accounting reversal to cancel a sale or purchase; reverse its stock and accounting effects together.
- Keep master records inactive instead of deleting parties with history.
- Run `pnpm run db:migrate` during deployment before application rollout.
