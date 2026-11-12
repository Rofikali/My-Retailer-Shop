import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { testDb, setUpTestDb, closeTestDb } from '../helpers/testDb'
import {
  inventoryMovements,
  inventoryValuationBalances,
  inventoryValuationEvents,
  products
} from '../../server/db/schema'

describe('Inventory valuation persistence constraints', () => {
  let userId: string
  let productId: string
  let movementId: string
  let eventId: string

  beforeAll(async () => {
    const setup = await setUpTestDb()
    userId = setup.userId

    const [product] = await testDb.insert(products).values({
      code: 'PRO-VALUATION-SCHEMA-1',
      name: 'Valuation Schema Rice',
      unit: 'Kg'
    }).returning()
    productId = product.id

    const [movement] = await testDb.insert(inventoryMovements).values({
      productId,
      movementDate: '2026-11-12',
      type: 'opening',
      quantity: '10.00',
      warehouse: 'Main',
      createdBy: userId
    }).returning()
    movementId = movement.id

    const [event] = await testDb.insert(inventoryValuationEvents).values({
      inventoryMovementId: movementId,
      productId,
      warehouse: 'Main',
      eventType: 'opening',
      quantityDelta: '10.00',
      valueDelta: '100.00',
      quantityAfter: '10.00',
      carryingValueAfter: '100.00',
      referenceType: null,
      referenceId: null,
      createdBy: userId
    }).returning()
    eventId = event.id

    await testDb.insert(inventoryValuationBalances).values({
      productId,
      warehouse: 'Main',
      quantity: '10.00',
      carryingValue: '100.00',
      valuationStatus: 'active',
      lastEventId: eventId,
      version: 1
    })
  })

  afterAll(async () => {
    await closeTestDb()
  })

  it('rejects duplicate valuation events for the same stock movement', async () => {
    await expect(testDb.insert(inventoryValuationEvents).values({
      inventoryMovementId: movementId,
      productId,
      warehouse: 'Main',
      eventType: 'opening',
      quantityDelta: '10.00',
      valueDelta: '100.00',
      quantityAfter: '10.00',
      carryingValueAfter: '100.00',
      createdBy: userId
    })).rejects.toThrow()
  })

  it('rejects an event whose source fields differ from its inventory movement', async () => {
    await expect(testDb.insert(inventoryValuationEvents).values({
      inventoryMovementId: movementId,
      productId,
      warehouse: 'Main',
      eventType: 'opening',
      quantityDelta: '9.00',
      valueDelta: '90.00',
      quantityAfter: '9.00',
      carryingValueAfter: '90.00',
      createdBy: userId
    })).rejects.toThrow(/must match its inventory movement/i)
  })

  it('prevents event updates and deletes at the database layer', async () => {
    await expect(testDb.update(inventoryValuationEvents)
      .set({ carryingValueAfter: '101.00' })
      .where(eq(inventoryValuationEvents.id, eventId)))
      .rejects.toThrow(/immutable/i)

    await expect(testDb.delete(inventoryValuationEvents)
      .where((await import('drizzle-orm')).eq(inventoryValuationEvents.id, eventId)))
      .rejects.toThrow(/immutable/i)
  })

  it('allows negative legacy quantity only while the valuation is uninitialized', async () => {
    await testDb.insert(inventoryValuationBalances).values({
      productId,
      warehouse: 'Legacy-Negative',
      quantity: '-2.00',
      carryingValue: '0.00',
      valuationStatus: 'uninitialized',
      version: 0
    })

    await expect(testDb.insert(inventoryValuationBalances).values({
      productId,
      warehouse: 'Active-Negative',
      quantity: '-2.00',
      carryingValue: '0.00',
      valuationStatus: 'active',
      version: 0
    })).rejects.toThrow()
  })

  it('requires zero carrying value when an active balance has zero quantity', async () => {
    await expect(testDb.insert(inventoryValuationBalances).values({
      productId,
      warehouse: 'Invalid-Zero-Stock',
      quantity: '0.00',
      carryingValue: '1.00',
      valuationStatus: 'active',
      version: 0
    })).rejects.toThrow()
  })

  it('rejects an uninitialized row that carries a value or points to an event', async () => {
    await expect(testDb.insert(inventoryValuationBalances).values({
      productId,
      warehouse: 'Invalid-Uninitialized',
      quantity: '5.00',
      carryingValue: '1.00',
      valuationStatus: 'uninitialized',
      lastEventId: eventId,
      version: 0
    })).rejects.toThrow()
  })
})
