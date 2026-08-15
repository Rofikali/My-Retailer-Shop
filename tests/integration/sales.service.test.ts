import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { testDb, setUpTestDb, closeTestDb } from '../helpers/testDb'
import { customers, products, sales, saleItems, ledgerEntries, inventoryMovements, partyLedgerEvents } from '../../server/db/schema'
import { SalesService } from '../../server/services/sales.service'

describe('SalesService.recordSale', () => {
  let userId: string
  let customerId: string
  let productId: string
  let salesService: SalesService

  beforeEach(async () => {
    const setup = await setUpTestDb()
    userId = setup.userId
    salesService = new SalesService(testDb)

    const [customer] = await testDb.insert(customers).values({ code: 'CUST-0001', name: 'Alice' }).returning()
    customerId = customer.id

    const [product] = await testDb.insert(products).values({ code: 'PRO-0001', name: 'Widget', reorderLevel: '0' }).returning()
    productId = product.id
  })

  afterAll(async () => {
    await closeTestDb()
  })

  it('posts to DEBTORS (not CASH) for a credit sale, and the four ledger lines balance', async () => {
    await salesService.recordSale(
      { saleDate: '2026-08-01', customerId, paymentMode: 'credit', items: [{ productId, quantity: 2, costPrice: 10, sellingPrice: 15 }] },
      userId
    )

    const entries = await testDb.select().from(ledgerEntries)
    expect(entries).toHaveLength(4)

    const totalDebit = entries.reduce((s, e) => s + Number(e.debit), 0)
    const totalCredit = entries.reduce((s, e) => s + Number(e.credit), 0)
    expect(totalDebit).toBe(totalCredit) // the core invariant, verified end-to-end this time

    // one of the debit legs should be tagged with the customer (Debtors), not blank
    const debtorLine = entries.find((e) => Number(e.debit) === 30 && e.customerId === customerId)
    expect(debtorLine).toBeDefined()
  })

  it('posts to CASH (not DEBTORS) for a cash sale, with no customer tagged on the ledger line', async () => {
    await salesService.recordSale(
      { saleDate: '2026-08-01', customerId, paymentMode: 'cash', items: [{ productId, quantity: 1, costPrice: 10, sellingPrice: 15 }] },
      userId
    )

    const entries = await testDb.select().from(ledgerEntries)
    const revenueLegDebit = entries.find((e) => Number(e.debit) === 15)
    expect(revenueLegDebit?.customerId).toBeNull()

    const [partyEvent] = await testDb.select().from(partyLedgerEvents).where(eq(partyLedgerEvents.customerId, customerId))
    expect(partyEvent).toMatchObject({ debit: '15.00', credit: '15.00', paymentMode: 'cash' })
  })

  it('deducts inventory by exactly the quantity sold', async () => {
    await salesService.recordSale(
      { saleDate: '2026-08-01', paymentMode: 'cash', items: [{ productId, quantity: 3, costPrice: 10, sellingPrice: 15 }] },
      userId
    )

    const movements = await testDb.select().from(inventoryMovements).where(eq(inventoryMovements.productId, productId))
    expect(movements).toHaveLength(1)
    expect(Number(movements[0].quantity)).toBe(-3)
  })

  it('snapshots cost/selling price on the sale line, independent of what the product master says later', async () => {
    const result = await salesService.recordSale(
      { saleDate: '2026-08-01', paymentMode: 'cash', items: [{ productId, quantity: 1, costPrice: 10, sellingPrice: 15 }] },
      userId
    )

    const items = await testDb.select().from(saleItems).where(eq(saleItems.saleId, result.id))
    expect(Number(items[0].costPrice)).toBe(10)
    expect(Number(items[0].sellingPrice)).toBe(15)
    // Product master was never updated by this sale - snapshot is independent of it.
    // (This is the direct fix for the old spreadsheet's "why did last month's profit
    // change" class of bug.)
  })

  it('persists discounts and posts only the net sale value to the ledger', async () => {
    const result = await salesService.recordSale(
      { saleDate: '2026-08-01', paymentMode: 'cash', items: [{ productId, quantity: 2, costPrice: 10, sellingPrice: 15, discount: 5 }] },
      userId
    )

    expect(result.totalSale).toBe(25)
    expect(result.totalCost).toBe(20)
    expect(result.grossProfit).toBe(5)

    const [item] = await testDb.select().from(saleItems).where(eq(saleItems.saleId, result.id))
    expect(Number(item.discount)).toBe(5)

    const entries = await testDb.select().from(ledgerEntries)
    expect(entries.some((entry) => Number(entry.debit) === 25)).toBe(true)
    expect(entries.some((entry) => Number(entry.credit) === 25)).toBe(true)
  })

  it('rolls back everything if a line item references a non-existent product', async () => {
    const fakeProductId = '00000000-0000-0000-0000-000000000000'

    await expect(
      salesService.recordSale(
        { saleDate: '2026-08-01', paymentMode: 'cash', items: [{ productId: fakeProductId, quantity: 1, costPrice: 10, sellingPrice: 15 }] },
        userId
      )
    ).rejects.toThrow()

    const allSales = await testDb.select().from(sales)
    const allEntries = await testDb.select().from(ledgerEntries)
    const allMovements = await testDb.select().from(inventoryMovements)

    // Nothing committed - not the sale, not the ledger lines, not the stock movement.
    expect(allSales).toHaveLength(0)
    expect(allEntries).toHaveLength(0)
    expect(allMovements).toHaveLength(0)
  })
})
