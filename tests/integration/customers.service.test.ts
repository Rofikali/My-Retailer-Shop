import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { testDb, setUpTestDb, closeTestDb } from '../helpers/testDb'
import { customers, ledgerEntries } from '../../server/db/schema'
import { CustomersService } from '../../server/services/customers.service'
import { LedgerService } from '../../server/services/ledger.service'

describe('CustomersService.create', () => {
  let userId: string
  let customersService: CustomersService

  beforeEach(async () => {
    const setup = await setUpTestDb()
    userId = setup.userId
    customersService = new CustomersService(testDb)
  })

  afterAll(async () => {
    await closeTestDb()
  })

  it('creates the master record and posts its opening receivable atomically', async () => {
    const customer = await customersService.create(
      { name: 'Acme Retail', company: 'Acme Pvt Ltd', phone: '9876543210', openingBalance: 500, creditLimit: 2_000, status: 'active', remarks: 'Priority account' },
      userId
    )

    const [stored] = await testDb.select().from(customers).where(eq(customers.id, customer.id))
    expect(stored).toMatchObject({ company: 'Acme Pvt Ltd', openingBalance: '500.00', assignedTo: userId })

    const entries = await testDb.select().from(ledgerEntries).where(eq(ledgerEntries.customerId, customer.id))
    expect(entries).toHaveLength(1)
    expect(Number(entries[0].debit)).toBe(500)
    expect(Number(entries[0].credit)).toBe(0)

    const detail = await customersService.getWithBalance(customer.id)
    expect(detail?.outstandingBalance).toBe(500)
    expect(detail?.ledger[0]).toMatchObject({
      voucherNo: expect.stringMatching(/^VCH-/),
      invoiceNo: null,
      status: 'posted',
      enteredByName: expect.any(String),
      approvedByName: expect.any(String)
    })
  })

  it('reverses an opening balance with mirror entries and blocks a second reversal', async () => {
    const customer = await customersService.create(
      { name: 'Reversal Test', openingBalance: 500, status: 'active' },
      userId
    )
    const ledger = new LedgerService(testDb)

    await testDb.transaction((tx) => ledger.reverse(tx as typeof testDb, customer.id, {
      entryDate: '2026-08-15',
      description: 'Reversal: opening balance entered in error',
      createdBy: userId
    }))

    const balance = await customersService.getWithBalance(customer.id)
    expect(balance?.outstandingBalance).toBe(0)
    await expect(testDb.transaction((tx) => ledger.reverse(tx as typeof testDb, customer.id, {
      entryDate: '2026-08-15', description: 'Reversal: duplicate attempt', createdBy: userId
    }))).rejects.toThrow('already been reversed')
  })
})
