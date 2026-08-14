import 'dotenv/config'
import { db } from './client'
import { accounts, users, businessProfile } from './schema'
import argon2 from 'argon2'

// Chart of accounts, seeded to match exactly what the P&L / Balance Sheet / Trial
// Balance queries expect. Add expense sub-categories here as you actually use them
// (don't pre-create categories you don't have data for).
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

async function main() {
  console.log('Seeding chart of accounts...')
  for (const acct of CHART_OF_ACCOUNTS) {
    await db.insert(accounts).values(acct).onConflictDoNothing({ target: accounts.code })
  }

  console.log('Seeding business profile...')
  await db.insert(businessProfile).values({
    businessName: '[Your Shop Name]',
    financialYearStart: '2026-04-01',
    financialYearEnd: '2027-03-31',
    gstRegistered: false
  })

  const ownerEmail = process.env.SEED_OWNER_EMAIL || 'owner@example.com'
  const ownerPassword = process.env.SEED_OWNER_PASSWORD
  if (process.env.NODE_ENV === 'production' && !ownerPassword) {
    throw new Error('SEED_OWNER_PASSWORD must be set when seeding a production database.')
  }
  const password = ownerPassword || 'ChangeMe123!'
  if (process.env.NODE_ENV === 'production' && password.length < 12) {
    throw new Error('SEED_OWNER_PASSWORD must be at least 12 characters in production.')
  }
  console.log(`Seeding owner user (${ownerEmail}).`)
  const passwordHash = await argon2.hash(password)
  await db.insert(users).values({
    name: '[Owner Name]',
    email: ownerEmail,
    passwordHash,
    role: 'owner'
  }).onConflictDoNothing({ target: users.email })

  console.log('Seed complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
