import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { testDb, setUpTestDb, closeTestDb } from '../helpers/testDb'
import { accounts, inventoryMovements, ledgerEntries, products, purchaseItems, purchases, saleItems, sales } from '../../server/db/schema'
import { ReportService } from '../../server/services/report.service'

describe('Inventory valuation preflight is read-only and evidence-based', () => {
  let userId: string

  beforeAll(async () => {
    const setup = await setUpTestDb()
    userId = setup.userId

    const [product] = await testDb.insert(products).values({
      code: 'PRO-PREFLIGHT-1', name: 'Preflight Rice', unit: 'Kg', costPrice: '999.00'
    }).returning()

    const [purchase] = await testDb.insert(purchases).values({
      purchaseNo: 'PUR-PREFLIGHT-1', purchaseDate: '2026-11-01', paymentMode: 'cash',
      status: 'paid', warehouse: 'Main', createdBy: userId
    }).returning()
    await testDb.insert(purchaseItems).values({
      purchaseId: purchase.id, productId: product.id, quantity: '10', unitCost: '10', discount: '0'
    })

    const [sale] = await testDb.insert(sales).values({
      invoiceNo: 'INV-PREFLIGHT-1', saleDate: '2026-11-02', paymentMode: 'cash',
      status: 'paid', createdBy: userId
    }).returning()
    await testDb.insert(saleItems).values({
      saleId: sale.id, productId: product.id, quantity: '3', costPrice: '10', sellingPrice: '15', discount: '0'
    })

    await testDb.insert(inventoryMovements).values([
      { productId: product.id, movementDate: '2026-11-01', type: 'purchase', quantity: '10', warehouse: 'Main', referenceType: 'purchase', referenceId: purchase.id, createdBy: userId },
      { productId: product.id, movementDate: '2026-11-02', type: 'sale', quantity: '-3', warehouse: 'Main', referenceType: 'sale', referenceId: sale.id, createdBy: userId },
      { productId: product.id, movementDate: '2026-11-03', type: 'damage', quantity: '-1', warehouse: 'Main', referenceType: 'manual', createdBy: userId },
      { productId: product.id, movementDate: '2026-11-04', type: 'sale', quantity: '-1', warehouse: 'Main', referenceType: 'sale', createdBy: userId }
    ])

    const [inventoryAccount] = await testDb.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, 'INVENTORY'))
    const [capitalAccount] = await testDb.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, 'CAPITAL'))
    const [cogsAccount] = await testDb.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, 'COGS'))
    await testDb.insert(ledgerEntries).values([
      { entryDate: '2026-11-01', accountId: inventoryAccount.id, debit: '100', credit: '0', referenceType: 'purchase', referenceId: purchase.id, createdBy: userId },
      { entryDate: '2026-11-01', accountId: capitalAccount.id, debit: '0', credit: '100', referenceType: 'purchase', referenceId: purchase.id, createdBy: userId },
      { entryDate: '2026-11-02', accountId: cogsAccount.id, debit: '30', credit: '0', referenceType: 'sale', referenceId: sale.id, createdBy: userId },
      { entryDate: '2026-11-02', accountId: inventoryAccount.id, debit: '0', credit: '30', referenceType: 'sale', referenceId: sale.id, createdBy: userId }
    ])
  })

  afterAll(async () => { await closeTestDb() })

  it('reports product/warehouse quantity, GL control balance, and unresolved provenance without mutation', async () => {
    const before = await testDb.select().from(inventoryMovements)
    const report = await new ReportService(testDb).inventoryValuationPreflight()
    const after = await testDb.select().from(inventoryMovements)

    expect(report.mode).toBe('read_only_preflight')
    expect(report.valuationCalculated).toBe(false)
    expect(report.inventoryControlBalance).toBe(70)
    expect(report.totals.movementCount).toBe(4)
    expect(report.totals.purchaseMovementCount).toBe(1)
    expect(report.totals.saleMovementCount).toBe(2)
    expect(report.totals.manualMovementCount).toBe(1)
    expect(report.totals.unlinkedSourceMovementCount).toBe(1)
    expect(report.readyForCutover).toBe(false)
    expect(report.productsByWarehouse[0].currentQuantity).toBe(5)
    expect(report.productsByWarehouse[0].requiresOwnerReview).toBe(true)
    expect(after).toHaveLength(before.length)
  })
})
