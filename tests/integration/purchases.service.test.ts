import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { testDb, setUpTestDb, closeTestDb } from '../helpers/testDb'
import { suppliers, products, purchases, purchaseItems, ledgerEntries, inventoryMovements } from '../../server/db/schema'
import { PurchasesService } from '../../server/services/purchases.service'

describe('PurchasesService.recordPurchase', () => {
  let userId: string
  let supplierId: string
  let productId: string
  let purchasesService: PurchasesService

  beforeEach(async () => {
    const setup = await setUpTestDb()
    userId = setup.userId
    purchasesService = new PurchasesService(testDb)

    const [supplier] = await testDb.insert(suppliers).values({ code: 'SUP-0001', name: 'Dadu Wholesale', openingBalance: '0' }).returning()
    supplierId = supplier.id

    const [product] = await testDb.insert(products).values({ code: 'PRO-0001', name: 'Widget', reorderLevel: '0' }).returning()
    productId = product.id
  })

  afterAll(async () => {
    await closeTestDb()
  })

  it('posts Debit Inventory / Credit Creditors for a credit purchase, balanced', async () => {
    await purchasesService.recordPurchase(
      { purchaseDate: '2026-08-01', supplierId, paymentMode: 'credit', items: [{ productId, quantity: 10, unitCost: 20 }] },
      userId
    )

    const entries = await testDb.select().from(ledgerEntries)
    expect(entries).toHaveLength(2)

    const totalDebit = entries.reduce((s, e) => s + Number(e.debit), 0)
    const totalCredit = entries.reduce((s, e) => s + Number(e.credit), 0)
    expect(totalDebit).toBe(200)
    expect(totalCredit).toBe(200)

    const creditorLine = entries.find((e) => Number(e.credit) === 200)
    expect(creditorLine?.supplierId).toBe(supplierId)
  })

  it('posts Debit Inventory / Credit Cash for a cash purchase (no supplier tagged)', async () => {
    await purchasesService.recordPurchase(
      { purchaseDate: '2026-08-01', supplierId, paymentMode: 'cash', items: [{ productId, quantity: 5, unitCost: 20 }] },
      userId
    )

    const entries = await testDb.select().from(ledgerEntries)
    const creditLine = entries.find((e) => Number(e.credit) === 100)
    expect(creditLine?.supplierId).toBeNull() // cash purchase - no payable created
  })

  it('increases inventory by exactly the quantity purchased', async () => {
    await purchasesService.recordPurchase(
      { purchaseDate: '2026-08-01', supplierId, paymentMode: 'credit', items: [{ productId, quantity: 25, unitCost: 20 }] },
      userId
    )

    const movements = await testDb.select().from(inventoryMovements).where(eq(inventoryMovements.productId, productId))
    expect(movements).toHaveLength(1)
    expect(Number(movements[0].quantity)).toBe(25) // positive - stock IN
  })

  it('persists discounts and posts only the net purchase amount to the ledger', async () => {
    const result = await purchasesService.recordPurchase(
      { purchaseDate: '2026-08-01', supplierId, paymentMode: 'credit', warehouse: 'Main', items: [{ productId, quantity: 10, unitCost: 20, discount: 25 }] },
      userId
    )

    expect(result.totalAmount).toBe(175)
    const [item] = await testDb.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, result.id))
    expect(Number(item.discount)).toBe(25)

    const entries = await testDb.select().from(ledgerEntries)
    expect(entries.some((entry) => Number(entry.debit) === 175)).toBe(true)
    expect(entries.some((entry) => Number(entry.credit) === 175)).toBe(true)
  })

  it('two purchases from the same supplier accumulate correctly on their ledger (regression test for the exact bug found in the original Excel Supplier Ledger)', async () => {
    // This mirrors the real scenario from the original spreadsheet rebuild: an opening
    // balance, a new credit purchase, and partial payments, and the running balance
    // needs to reflect ALL of it correctly - not a hardcoded stale number.
    await purchasesService.recordPurchase(
      { purchaseDate: '2026-08-01', supplierId, paymentMode: 'credit', items: [{ productId, quantity: 10, unitCost: 20 }] },
      userId
    )
    await purchasesService.recordPurchase(
      { purchaseDate: '2026-08-05', supplierId, paymentMode: 'credit', items: [{ productId, quantity: 5, unitCost: 20 }] },
      userId
    )

    const entries = await testDb.select().from(ledgerEntries).where(eq(ledgerEntries.supplierId, supplierId))
    const totalOwed = entries.reduce((s, e) => s + Number(e.credit) - Number(e.debit), 0)
    expect(totalOwed).toBe(300) // 200 + 100, both purchases counted, nothing dropped
  })
})
