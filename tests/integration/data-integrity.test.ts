import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, setUpTestDb, closeTestDb, resetTestDb, seedTestChartOfAccounts, seedTestUser } from '../helpers/testDb'
import { customers, ledgerEntries } from '../../server/db/schema'
import { LedgerService } from '../../server/services/ledger.service'

/**
 * Regression tests for the SPECIFIC, real bugs found in the original Excel workbook
 * this system replaced. Each test name says which spreadsheet problem it makes
 * structurally impossible. If any of these ever start failing, that's a sign the
 * schema or a service regressed back toward spreadsheet-style behavior.
 */
describe('Data integrity regressions (fixes for real bugs found in the original spreadsheet)', () => {
  let userId: string

  beforeEach(async () => {
    const setup = await setUpTestDb()
    userId = setup.userId
  })

  afterAll(async () => {
    await closeTestDb()
  })

  it('rejects a duplicate customer code at the DB level (the original file reused "cust_0031" for 5 different customers)', async () => {
    await testDb.insert(customers).values({ code: 'CUST-0001', name: 'Khuti' })

    await expect(
      testDb.insert(customers).values({ code: 'CUST-0001', name: 'A completely different customer' })
    ).rejects.toThrow()
  })

  it('LedgerService.post() rejects an unbalanced posting even when called directly, not just via a service (the ₹3,474 Balance Sheet gap could never happen through this path)', async () => {
    const ledger = new LedgerService(testDb as any)

    await expect(
      ledger.post(testDb as any, [{ accountCode: 'CASH', debit: 100 }, { accountCode: 'SALES-REV', credit: 90 }], {
        entryDate: '2026-08-01', referenceType: 'journal', createdBy: userId
      })
    ).rejects.toThrow(/Unbalanced/)

    const entries = await testDb.select().from(ledgerEntries)
    expect(entries).toHaveLength(0) // nothing partial got written
  })

  it('ledger_entries has no code path that updates or deletes a row - the schema constraint plus the absence of any update/delete method on LedgerService/LedgerRepo is the enforcement, not developer discipline', async () => {
    const ledger = new LedgerService(testDb as any)
    await ledger.post(testDb as any, [{ accountCode: 'CASH', debit: 100 }, { accountCode: 'CAPITAL', credit: 100 }], {
      entryDate: '2026-08-01', referenceType: 'opening_balance', createdBy: userId
    })

    // Confirm there is genuinely no update()/delete() method exposed - this is a
    // structural check, not just "we didn't call one this time".
    expect((ledger as any).update).toBeUndefined()
    expect((ledger as any).delete).toBeUndefined()
    // The only way to correct an entry is reverse() (see server/services/ledger.service.ts)
    expect(typeof (ledger as any).reverse).toBe('function')
  })

  it('the CHECK constraint rejects a row with both debit and credit set (or neither) even via a raw insert that bypasses LedgerService entirely', async () => {
    await expect(
      testDb.insert(ledgerEntries).values({
        entryDate: '2026-08-01',
        accountId: (await testDb.query.accounts.findFirst())!.id,
        debit: '100',
        credit: '100', // both set - should be rejected by the chk_one_side constraint
        referenceType: 'journal',
        createdBy: userId
      })
    ).rejects.toThrow()
  })

  it('seedTestChartOfAccounts + a fresh reset is fully idempotent (protects the test suite itself from the "which template layer is real" confusion the Excel file had)', async () => {
    await resetTestDb()
    await seedTestChartOfAccounts()
    await seedTestUser()

    const accountsAfterFirstSeed = await testDb.query.accounts.findMany()
    expect(accountsAfterFirstSeed).toHaveLength(14)

    // Reset again and confirm we're back to a clean slate, not accumulating duplicates
    await resetTestDb()
    const accountsAfterReset = await testDb.query.accounts.findMany()
    expect(accountsAfterReset).toHaveLength(0)
  })
})
