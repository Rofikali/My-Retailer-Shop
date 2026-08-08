import {
  pgTable, uuid, text, numeric, date, timestamp, boolean, pgEnum, check
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const userRoleEnum = pgEnum('user_role', ['owner', 'staff', 'accountant_readonly'])
export const accountTypeEnum = pgEnum('account_type', ['asset', 'liability', 'equity', 'income', 'expense'])
export const referenceTypeEnum = pgEnum('reference_type', [
  'sale', 'purchase', 'expense', 'cash_txn', 'journal', 'opening_balance', 'reversal'
])
export const movementTypeEnum = pgEnum('movement_type', ['opening', 'purchase', 'sale', 'damage', 'adjustment'])
export const paymentModeEnum = pgEnum('payment_mode', ['cash', 'upi', 'credit'])
export const saleStatusEnum = pgEnum('sale_status', ['paid', 'pending'])
export const cashCategoryEnum = pgEnum('cash_category', ['capital', 'sales', 'expense', 'drawings', 'purchase', 'other'])

// ---------------------------------------------------------------------------
// Auth / Core
// ---------------------------------------------------------------------------
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('staff'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const businessProfile = pgTable('business_profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessName: text('business_name').notNull(),
  financialYearStart: date('financial_year_start').notNull(),
  financialYearEnd: date('financial_year_end').notNull(),
  gstRegistered: boolean('gst_registered').notNull().default(false),
  gstin: text('gstin'),
  address: text('address')
})

// ---------------------------------------------------------------------------
// Chart of Accounts + Ledger  (source of truth for every financial report)
// ---------------------------------------------------------------------------
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),           // 'CASH', 'DEBTORS', 'SALES-REV', 'COGS', ...
  name: text('name').notNull(),
  type: accountTypeEnum('type').notNull(),
  parentId: uuid('parent_id')
})

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),            // CUST-0001, generated, never reused
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  creditLimit: numeric('credit_limit', { precision: 12, scale: 2 }),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  address: text('address'),
  openingBalance: numeric('opening_balance', { precision: 12, scale: 2 }).notNull().default('0'),
  creditTermsDays: numeric('credit_terms_days', { precision: 5, scale: 0 }),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

// APPEND-ONLY. Application code must never UPDATE or DELETE a row here.
// Corrections are new rows with reversesEntryId pointing at what they reverse.
export const ledgerEntries = pgTable('ledger_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  entryDate: date('entry_date').notNull(),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  debit: numeric('debit', { precision: 12, scale: 2 }).notNull().default('0'),
  credit: numeric('credit', { precision: 12, scale: 2 }).notNull().default('0'),
  description: text('description'),
  referenceType: referenceTypeEnum('reference_type').notNull(),
  referenceId: uuid('reference_id'),
  customerId: uuid('customer_id').references(() => customers.id),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  reversesEntryId: uuid('reverses_entry_id'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  oneSided: check('chk_one_side', sql`(${table.debit} > 0 AND ${table.credit} = 0) OR (${table.credit} > 0 AND ${table.debit} = 0)`)
}))

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),           // PRO-001, generated
  name: text('name').notNull(),
  category: text('category'),
  unit: text('unit'),
  reorderLevel: numeric('reorder_level', { precision: 10, scale: 2 }).notNull().default('0'),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }),
  sellingPrice: numeric('selling_price', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

// APPEND-ONLY. Current stock = SUM(quantity) per product. Never store a "closing stock" column.
export const inventoryMovements = pgTable('inventory_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id),
  movementDate: date('movement_date').notNull(),
  type: movementTypeEnum('type').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(), // + in, - out
  referenceType: text('reference_type'),
  referenceId: uuid('reference_id'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------
export const sales = pgTable('sales', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceNo: text('invoice_no').notNull().unique(),
  saleDate: date('sale_date').notNull(),
  customerId: uuid('customer_id').references(() => customers.id), // null = walk-in
  paymentMode: paymentModeEnum('payment_mode').notNull(),
  status: saleStatusEnum('status').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const saleItems = pgTable('sale_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  saleId: uuid('sale_id').notNull().references(() => sales.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull(),      // snapshot
  sellingPrice: numeric('selling_price', { precision: 12, scale: 2 }).notNull() // snapshot
})

// ---------------------------------------------------------------------------
// Purchases
// ---------------------------------------------------------------------------
export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  purchaseNo: text('purchase_no').notNull().unique(),
  purchaseDate: date('purchase_date').notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  paymentMode: paymentModeEnum('payment_mode').notNull(),
  status: saleStatusEnum('status').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const purchaseItems = pgTable('purchase_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  purchaseId: uuid('purchase_id').notNull().references(() => purchases.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull()
})

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------
export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  expenseNo: text('expense_no').notNull().unique(),
  expenseDate: date('expense_date').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  vendor: text('vendor'),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  paymentMode: text('payment_mode'),
  department: text('department'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

// ---------------------------------------------------------------------------
// Cash Book  (human-readable receipts & payments view; ledger_entries remains authoritative)
// ---------------------------------------------------------------------------
export const cashTxnStatusEnum = pgEnum('cash_txn_status', ['posted', 'reversed'])

export const cashTxns = pgTable('cash_txns', {
  id: uuid('id').primaryKey().defaultRandom(),
  txnDate: date('txn_date').notNull(),
  voucherNo: text('voucher_no').notNull().unique(),
  particulars: text('particulars'),
  category: cashCategoryEnum('category').notNull(),
  receipt: numeric('receipt', { precision: 12, scale: 2 }).notNull().default('0'),
  payment: numeric('payment', { precision: 12, scale: 2 }).notNull().default('0'),
  paymentMode: text('payment_mode'),
  referenceNo: text('reference_no'),
  status: cashTxnStatusEnum('status').notNull().default('posted'),
  remarks: text('remarks'),
  createdBy: uuid('created_by').references(() => users.id),
  approvedBy: uuid('approved_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})
// Note: voucherType ("Receipt"/"Payment") and accountHead ("<Category> Account") from
// your sheet are DERIVED, not stored - computed in CashBookRepo.list() from receipt/
// payment and category. Storing them as separate columns would let them drift from the
// row they describe, which is exactly the class of bug this whole system exists to
// avoid. Same reasoning for Running Balance - computed with a SQL window function on
// read, never stored, so it can never go stale relative to the transactions.
