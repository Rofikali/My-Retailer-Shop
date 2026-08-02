import { describe, it, expect, vi } from 'vitest'
import { LedgerService } from '../server/services/ledger.service'

/**
 * This is the single most important test in the codebase: it verifies the rule that
 * makes the Excel reconciliation bug structurally impossible. Every other test in the
 * suite matters less than this one staying green.
 */
describe('LedgerService.post', () => {
  it('rejects a set of lines where total debit does not equal total credit', async () => {
    const fakeDb = {} as any
    const service = new LedgerService(fakeDb)

    await expect(
      service.post(fakeDb, [
        { accountCode: 'CASH', debit: 100 },
        { accountCode: 'SALES-REV', credit: 90 } // deliberately unbalanced
      ], {
        entryDate: '2026-08-01',
        referenceType: 'sale',
        createdBy: 'test-user'
      })
    ).rejects.toThrow(/Unbalanced ledger posting rejected/)
  })

  it('rejects an empty set of lines', async () => {
    const fakeDb = {} as any
    const service = new LedgerService(fakeDb)

    await expect(
      service.post(fakeDb, [], {
        entryDate: '2026-08-01',
        referenceType: 'sale',
        createdBy: 'test-user'
      })
    ).rejects.toThrow(/empty set/)
  })

  it('does not throw the balance-check error for sub-cent rounding differences', async () => {
    const fakeDb = {} as any
    const service = new LedgerService(fakeDb)
    // 0.001 is within the 0.005 tolerance, so this should get PAST the balance check.
    // It still throws, but from insertLines() hitting the fake db, not from the
    // "Unbalanced ledger posting rejected" check - that's the thing this test verifies.
    await expect(
      service.post(fakeDb, [
        { accountCode: 'CASH', debit: 100.001 },
        { accountCode: 'SALES-REV', credit: 100 }
      ], { entryDate: '2026-08-01', referenceType: 'sale', createdBy: 'test-user' })
    ).rejects.not.toThrow(/Unbalanced ledger posting rejected/)
  })
})
