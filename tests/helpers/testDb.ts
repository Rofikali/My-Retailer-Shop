import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import * as schema from '../../server/db/schema'
import argon2 from 'argon2'

const connectionString = process.env.TEST_DATABASE_URL

if (!connectionString) {
  throw new Error(
    'TEST_DATABASE_URL is not set. Copy it from .env.example into .env, and make sure ' +
    'the retailshop_test database exists (see README.md "Running tests" section).'
  )
}

const client = postgres(connectionString, { max: 5 })
export const testDb = drizzle(client, { schema })

/**
 * Truncates every application table and restarts identity sequences, so each test
 * (or test file) starts from a completely empty database. Order doesn't matter -
 * TRUNCATE ... CASCADE handles foreign key dependencies for us.
 */
export async function resetTestDb() {
  await testDb.execute(sql`
    TRUNCATE TABLE
      ledger_entries, inventory_movements, sale_items, sales, purchase_items, purchases,
      expenses, cash_txns, customers, suppliers, products, accounts, users, business_profile
    RESTART IDENTITY CASCADE
  `)
}

/** Seeds the same chart of accounts as server/db/seed.ts - kept as a literal copy
 *  rather than importing seed.ts, so a change to the real seed script doesn't silently
 *  change what the test suite is asserting against without a deliberate test update. */
export async function seedTestChartOfAccounts() {
  const CHART_OF_ACCOUNTS = [
    { code: 'CASH', name: 'Cash & Bank', type: 'asset' as const },
    { code: 'DEBTORS', name: 'Sundry Debtors', type: 'asset' as const },
    { code: 'INVENTORY', name: 'Inventory', type: 'asset' as const },
    { code: 'CREDITORS', name: 'Sundry Creditors', type: 'liability' as const },
    { code: 'CAPITAL', name: 'Owner Capital', type: 'equity' as const },
    { code: 'DRAWINGS', name: 'Drawings', type: 'equity' as const },
    { code: 'SALES-REV', name: 'Sales Revenue', type: 'income' as const },
    { code: 'COGS', name: 'Cost of Goods Sold', type: 'expense' as const },
    { code: 'EXP-UTILITIES', name: 'Utilities', type: 'expense' as const },
    { code: 'EXP-TRANSPORT', name: 'Transportation', type: 'expense' as const },
    { code: 'EXP-MAINTENANCE', name: 'Maintenance', type: 'expense' as const },
    { code: 'EXP-OFFICE', name: 'Office Supplies', type: 'expense' as const },
    { code: 'EXP-LOSS', name: 'Business Loss', type: 'expense' as const },
    { code: 'EXP-OTHER', name: 'Other Expenses', type: 'expense' as const }
  ]
  await testDb.insert(schema.accounts).values(CHART_OF_ACCOUNTS)
}

/** Creates one test user and returns its id - almost every service call needs a
 *  createdBy, so tests need a real users row to satisfy the foreign key. */
export async function seedTestUser(): Promise<string> {
  const passwordHash = await argon2.hash('TestPassword123!')
  const [row] = await testDb
    .insert(schema.users)
    .values({ name: 'Test Owner', email: 'test-owner@example.com', passwordHash, role: 'owner' })
    .returning({ id: schema.users.id })
  return row.id
}

/** Standard setup for an integration test file: empty DB, chart of accounts, one user. */
export async function setUpTestDb(): Promise<{ userId: string }> {
  await resetTestDb()
  await seedTestChartOfAccounts()
  const userId = await seedTestUser()
  return { userId }
}

export async function closeTestDb() {
  await client.end()
}
