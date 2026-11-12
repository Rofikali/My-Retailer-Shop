import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { and, eq } from 'drizzle-orm'
import type { Database } from '../../server/db/client'
import { inventoryValuationService } from '../../server/services/inventory-valuation.service'
import {
  inventoryMovements,
  inventoryValuationBalances,
  inventoryValuationEvents,
  products
} from '../../server/db/schema'
import { closeTestDb, setUpTestDb, testDb } from '../helpers/testDb'

describe('InventoryValuationService', () => {
  let userId: string
  let productId: string

  async function createProduct(code: string) {
    const [product] = await testDb.insert(products).values({
      code,
      name: code,
      unit: 'Kg'
    }).returning()
    return product.id
  }

  function receive(input: {
    productId: string
    warehouse?: string
    quantity: string
    acquisitionValueMinorUnits: string
  }) {
    return testDb.transaction((tx) => inventoryValuationService.receive(tx as unknown as Database, {
      productId: input.productId,
      warehouse: input.warehouse ?? 'Main',
      movementDate: '2026-11-12',
      createdBy: userId,
      referenceType: 'purchase',
      referenceId: null,
      quantity: input.quantity,
      acquisitionValueMinorUnits: input.acquisitionValueMinorUnits
    }))
  }

  function issue(input: { productId: string; warehouse?: string; quantity: string }) {
    return testDb.transaction((tx) => inventoryValuationService.issue(tx as unknown as Database, {
      productId: input.productId,
      warehouse: input.warehouse ?? 'Main',
      movementDate: '2026-11-12',
      createdBy: userId,
      referenceType: 'sale',
      referenceId: null,
      quantity: input.quantity
    }))
  }

  beforeAll(async () => {
    const setup = await setUpTestDb()
    userId = setup.userId
    productId = await createProduct('PRO-MWAC-SERVICE-1')
  })

  afterAll(async () => {
    await closeTestDb()
  })

  it('receives stock and atomically writes movement, valuation event, and active balance', async () => {
    const result = await receive({
      productId,
      quantity: '10.00',
      acquisitionValueMinorUnits: '12345'
    })

    expect(result.movement.quantity).toBe('10.00')
    expect(result.event.quantityDelta).toBe('10.00')
    expect(result.event.valueDelta).toBe('123.45')
    expect(result.event.quantityAfter).toBe('10.00')
    expect(result.event.carryingValueAfter).toBe('123.45')
    expect(result.balance.valuationStatus).toBe('active')
    expect(result.balance.quantity).toBe('10.00')
    expect(result.balance.carryingValue).toBe('123.45')
    expect(result.balance.lastEventId).toBe(result.event.id)
    expect(result.balance.version).toBe(1)
  })

  it('issues stock at moving weighted-average cost using exact paise', async () => {
    const result = await issue({ productId, quantity: '4.00' })

    expect(result.movement.quantity).toBe('-4.00')
    expect(result.event.quantityDelta).toBe('-4.00')
    expect(result.event.valueDelta).toBe('-49.38')
    expect(result.cogsMinorUnits).toBe('4938')
    expect(result.balance.quantity).toBe('6.00')
    expect(result.balance.carryingValue).toBe('74.07')
    expect(result.balance.version).toBe(2)
  })

  it('rejects uninitialized legacy stock without creating a movement or valuation event', async () => {
    await testDb.insert(inventoryValuationBalances).values({
      productId,
      warehouse: 'Legacy',
      quantity: '7.00',
      carryingValue: '0.00',
      valuationStatus: 'uninitialized',
      version: 0
    })

    await expect(receive({
      productId,
      warehouse: 'Legacy',
      quantity: '1.00',
      acquisitionValueMinorUnits: '100'
    })).rejects.toThrow(/uninitialized/i)

    const movements = await testDb.select().from(inventoryMovements)
      .where(and(eq(inventoryMovements.productId, productId), eq(inventoryMovements.warehouse, 'Legacy')))
    const events = await testDb.select().from(inventoryValuationEvents)
      .where(and(eq(inventoryValuationEvents.productId, productId), eq(inventoryValuationEvents.warehouse, 'Legacy')))

    expect(movements).toHaveLength(0)
    expect(events).toHaveLength(0)
  })

  it('rejects an issue larger than available stock before writing a movement', async () => {
    await expect(issue({ productId, quantity: '7.00' }))
      .rejects.toThrow(/insufficient stock/i)

    const movements = await testDb.select().from(inventoryMovements)
      .where(eq(inventoryMovements.productId, productId))
    expect(movements).toHaveLength(2)
  })

  it('serializes concurrent issues so only one can consume the available stock', async () => {
    const concurrentProductId = await createProduct('PRO-MWAC-CONCURRENCY-1')
    await receive({
      productId: concurrentProductId,
      quantity: '10.00',
      acquisitionValueMinorUnits: '10000'
    })

    const outcomes = await Promise.allSettled([
      issue({ productId: concurrentProductId, quantity: '6.00' }),
      issue({ productId: concurrentProductId, quantity: '6.00' })
    ])

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1)

    const [balance] = await testDb.select().from(inventoryValuationBalances).where(and(
      eq(inventoryValuationBalances.productId, concurrentProductId),
      eq(inventoryValuationBalances.warehouse, 'Main')
    ))
    const movements = await testDb.select().from(inventoryMovements)
      .where(eq(inventoryMovements.productId, concurrentProductId))
    const events = await testDb.select().from(inventoryValuationEvents)
      .where(eq(inventoryValuationEvents.productId, concurrentProductId))

    expect(balance.quantity).toBe('4.00')
    expect(balance.carryingValue).toBe('40.00')
    expect(balance.version).toBe(2)
    expect(movements).toHaveLength(2)
    expect(events).toHaveLength(2)
  })

  it('blocks an active balance when an unvalued legacy movement exists in that warehouse', async () => {
    const mixedHistoryProductId = await createProduct('PRO-MWAC-MIXED-HISTORY-1')

    await testDb.insert(inventoryValuationBalances).values({
      productId: mixedHistoryProductId,
      warehouse: 'Main',
      quantity: '0.00',
      carryingValue: '0.00',
      valuationStatus: 'active',
      version: 0
    })
    await testDb.insert(inventoryMovements).values({
      productId: mixedHistoryProductId,
      movementDate: '2026-11-12',
      type: 'purchase',
      quantity: '2.00',
      warehouse: 'Main',
      createdBy: userId
    })

    await expect(receive({
      productId: mixedHistoryProductId,
      quantity: '1.00',
      acquisitionValueMinorUnits: '100'
    })).rejects.toThrow(/unvalued legacy movement/i)

    const events = await testDb.select().from(inventoryValuationEvents)
      .where(eq(inventoryValuationEvents.productId, mixedHistoryProductId))
    expect(events).toHaveLength(0)
  })

  it('rolls back movement, event, and balance together when the caller aborts its transaction', async () => {
    const rollbackProductId = await createProduct('PRO-MWAC-ROLLBACK-1')

    await expect(testDb.transaction(async (tx) => {
      await inventoryValuationService.receive(tx as unknown as Database, {
        productId: rollbackProductId,
        warehouse: 'Main',
        movementDate: '2026-11-12',
        createdBy: userId,
        quantity: '5.00',
        acquisitionValueMinorUnits: '5000'
      })
      throw new Error('caller abort')
    })).rejects.toThrow('caller abort')

    const balances = await testDb.select().from(inventoryValuationBalances)
      .where(eq(inventoryValuationBalances.productId, rollbackProductId))
    const movements = await testDb.select().from(inventoryMovements)
      .where(eq(inventoryMovements.productId, rollbackProductId))
    const events = await testDb.select().from(inventoryValuationEvents)
      .where(eq(inventoryValuationEvents.productId, rollbackProductId))

    expect(balances).toHaveLength(0)
    expect(movements).toHaveLength(0)
    expect(events).toHaveLength(0)
  })

  it('rejects negative acquisition values and zero-quantity receipts without persistence', async () => {
    const validationProductId = await createProduct('PRO-MWAC-VALIDATION-1')

    await expect(receive({
      productId: validationProductId,
      quantity: '1.00',
      acquisitionValueMinorUnits: '-1'
    })).rejects.toThrow(/minor units/i)

    await expect(receive({
      productId: validationProductId,
      quantity: '0.00',
      acquisitionValueMinorUnits: '100'
    })).rejects.toThrow(/greater than zero/i)

    const balances = await testDb.select().from(inventoryValuationBalances)
      .where(eq(inventoryValuationBalances.productId, validationProductId))
    expect(balances).toHaveLength(0)
  })
})
