import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, setUpTestDb, closeTestDb } from '../helpers/testDb'
import { cashTxns, ledgerEntries } from '../../server/db/schema'
import { CashBookService } from '../../server/services/cashbook.service'

describe('CashBookService.record', () => {
  let userId: string
  let cashBookService: CashBookService

  beforeEach(async () => {
    const setup = await setUpTestDb()
    userId = setup.userId
    cashBookService = new CashBookService(testDb)
  })

  afterAll(async () => {
    await closeTestDb()
  })

  it('a receipt debits CASH and credits the category account', async () => {
    await cashBookService.record(
      { txnDate: '2026-08-01', particulars: 'Owner capital', category: 'capital', receipt: 5000, payment: 0, paymentMode: 'UPI' },
      userId
    )

    const entries = await testDb.select().from(ledgerEntries)
    expect(entries).toHaveLength(2)
    const cashLine = entries.find((e) => Number(e.debit) === 5000)
    const capitalLine = entries.find((e) => Number(e.credit) === 5000)
    expect(cashLine).toBeDefined()
    expect(capitalLine).toBeDefined()
  })

  it('a payment credits CASH and debits the category account', async () => {
    await cashBookService.record(
      { txnDate: '2026-08-01', particulars: 'Electricity', category: 'expense', receipt: 0, payment: 800, paymentMode: 'Cash' },
      userId
    )

    const entries = await testDb.select().from(ledgerEntries)
    const cashLine = entries.find((e) => Number(e.credit) === 800)
    expect(cashLine).toBeDefined()
  })

  it('auto-generates sequential voucher numbers (CB-0001, CB-0002, ...)', async () => {
    const first = await cashBookService.record(
      { txnDate: '2026-08-01', particulars: 'First', category: 'capital', receipt: 100, payment: 0, paymentMode: 'Cash' },
      userId
    )
    const second = await cashBookService.record(
      { txnDate: '2026-08-02', particulars: 'Second', category: 'expense', receipt: 0, payment: 50, paymentMode: 'Cash' },
      userId
    )

    expect(first.voucherNo).toBe('CB-0001')
    expect(second.voucherNo).toBe('CB-0002')
  })

  it('rejects a duplicate voucher number at the DB level (defense in depth beyond the auto-generated sequence)', async () => {
    await testDb.insert(cashTxns).values({
      txnDate: '2026-08-01', voucherNo: 'CB-9999', category: 'capital', receipt: '100', payment: '0', createdBy: userId
    })

    await expect(
      testDb.insert(cashTxns).values({
        txnDate: '2026-08-02', voucherNo: 'CB-9999', category: 'expense', receipt: '0', payment: '50', createdBy: userId
      })
    ).rejects.toThrow()
  })
})
