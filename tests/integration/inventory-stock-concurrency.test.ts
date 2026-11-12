import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { testDb, setUpTestDb, closeTestDb } from '../helpers/testDb'
import { inventoryMovements, products } from '../../server/db/schema'
import type { Database } from '../../server/db/client'
import { InventoryService } from '../../server/services/inventory.service'

describe('InventoryService legacy stock-writer serialization', () => {
  let userId: string
  let productId: string
  let inventory: InventoryService

  beforeEach(async () => {
    const setup = await setUpTestDb()
    userId = setup.userId
    inventory = new InventoryService(testDb)

    const [product] = await testDb.insert(products).values({
      code: 'PRO-LOCK-0001',
      name: 'Lock Test Product',
      reorderLevel: '0',
      costPrice: '0.00'
    }).returning()
    productId = product.id
  })

  afterAll(async () => {
    await closeTestDb()
  })

  it('allows only one of two concurrent issues that would otherwise oversell stock', async () => {
    await inventory.adjustStock({
      productId,
      adjustmentDate: '2026-08-01',
      reason: 'opening',
      quantity: 5,
      warehouse: 'Main'
    }, userId)

    const issue = (quantity: number) => testDb.transaction(async (tx) => {
      await inventory.deduct(
        tx as unknown as Database,
        [{ productId, quantity }],
        {
          movementDate: '2026-08-02',
          referenceType: 'sale',
          referenceId: randomUUID(),
          createdBy: userId,
          warehouse: 'Main'
        }
      )
    })

    const results = await Promise.allSettled([issue(4), issue(4)])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)

    const rejected = results.find((result) => result.status === 'rejected')
    expect(rejected?.status).toBe('rejected')
    if (rejected?.status === 'rejected') {
      expect(String(rejected.reason)).toMatch(/insufficient stock/i)
    }

    const movements = await testDb.select().from(inventoryMovements).where(eq(inventoryMovements.productId, productId))
    expect(movements).toHaveLength(2)
    const currentStock = movements.reduce((total, movement) => total + Number(movement.quantity), 0)
    expect(currentStock).toBe(1)
  })

  it('aggregates duplicate product lines before checking available stock', async () => {
    await inventory.adjustStock({
      productId,
      adjustmentDate: '2026-08-01',
      reason: 'opening',
      quantity: 5,
      warehouse: 'Main'
    }, userId)

    await expect(testDb.transaction(async (tx) => inventory.deduct(
      tx as unknown as Database,
      [{ productId, quantity: 3 }, { productId, quantity: 3 }],
      {
        movementDate: '2026-08-02',
        referenceType: 'sale',
        referenceId: randomUUID(),
        createdBy: userId,
        warehouse: 'Main'
      }
    ))).rejects.toThrow(/insufficient stock/i)

    const movements = await testDb.select().from(inventoryMovements).where(eq(inventoryMovements.productId, productId))
    expect(movements).toHaveLength(1)
    expect(Number(movements[0].quantity)).toBe(5)
  })

  it('preserves the adjustment movement type for positive count corrections', async () => {
    await inventory.adjustStock({
      productId,
      adjustmentDate: '2026-08-01',
      reason: 'correction',
      quantity: 2,
      warehouse: 'Main'
    }, userId)

    const [movement] = await testDb.select().from(inventoryMovements).where(eq(inventoryMovements.productId, productId))
    expect(movement).toMatchObject({ type: 'adjustment', quantity: '2.00' })
  })

  it('rejects damage and negative corrections that would create negative stock', async () => {
    await expect(inventory.adjustStock({
      productId,
      adjustmentDate: '2026-08-01',
      reason: 'damage',
      quantity: 1,
      warehouse: 'Main'
    }, userId)).rejects.toThrow(/insufficient stock/i)

    await expect(inventory.adjustStock({
      productId,
      adjustmentDate: '2026-08-01',
      reason: 'correction',
      quantity: -1,
      warehouse: 'Main'
    }, userId)).rejects.toThrow(/insufficient stock/i)

    const movements = await testDb.select().from(inventoryMovements).where(eq(inventoryMovements.productId, productId))
    expect(movements).toHaveLength(0)
  })
})
