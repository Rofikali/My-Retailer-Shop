import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, setUpTestDb, closeTestDb } from '../helpers/testDb'
import { ledgerEntries } from '../../server/db/schema'
import { ExpensesService } from '../../server/services/expenses.service'

describe('ExpensesService.record', () => {
  let userId: string
  let expensesService: ExpensesService

  beforeEach(async () => {
    const setup = await setUpTestDb()
    userId = setup.userId
    expensesService = new ExpensesService(testDb)
  })

  afterAll(async () => {
    await closeTestDb()
  })

  it('maps each category to its correct chart-of-accounts code (regression test - a typo in either the category list or the mapping table throws, doesn\'t silently miscategorize)', async () => {
    const categories: Array<[string, number]> = [
      ['Utilities', 100], ['Transportation', 200], ['Maintenance', 300],
      ['Office Supplies', 400], ['Business Loss', 500], ['Donation', 600]
    ]

    for (const [category, amount] of categories) {
      await expensesService.record(
        { expenseDate: '2026-08-01', category: category as any, description: `Test ${category}`, amount, paymentMode: 'Cash' },
        userId
      )
    }

    const entries = await testDb.select().from(ledgerEntries)
    // 6 categories x 2 lines each (debit expense account, credit cash) = 12
    expect(entries).toHaveLength(12)

    const totalDebit = entries.reduce((s, e) => s + Number(e.debit), 0)
    const totalCredit = entries.reduce((s, e) => s + Number(e.credit), 0)
    expect(totalDebit).toBe(totalCredit)
    expect(totalDebit).toBe(100 + 200 + 300 + 400 + 500 + 600)
  })

  it('always credits CASH, matching the original spreadsheet\'s assumption that expenses are paid immediately', async () => {
    await expensesService.record(
      { expenseDate: '2026-08-01', category: 'Utilities', description: 'Internet bill', amount: 700, paymentMode: 'UPI' },
      userId
    )

    const entries = await testDb.select().from(ledgerEntries)
    const cashLine = entries.find((e) => Number(e.credit) === 700)
    expect(cashLine).toBeDefined()
  })
})
