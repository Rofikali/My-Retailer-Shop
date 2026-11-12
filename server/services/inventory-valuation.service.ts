import { and, eq, isNull, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import {
  inventoryMovements,
  inventoryValuationBalances,
  inventoryValuationEvents
} from '../db/schema'
import { issueMwac, receiveMwac } from '../domain/inventory/mwac'
import { lockInventoryScopes } from './inventory-write-lock.service'

export interface ValuationSource {
  productId: string
  warehouse: string
  movementDate: string
  createdBy: string
  referenceType?: string | null
  referenceId?: string | null
  remarks?: string | null
}

export interface ValuationReceiptInput extends ValuationSource {
  quantity: string
  /** Net acquisition value in integer currency minor units (paise for INR). */
  acquisitionValueMinorUnits: string
}

export interface ValuationIssueInput extends ValuationSource {
  quantity: string
}

function assertSource(input: ValuationSource) {
  if (!input.productId.trim()) throw new TypeError('Product ID is required.')
  if (!input.warehouse.trim() || input.warehouse !== input.warehouse.trim()) {
    throw new TypeError('Warehouse is required and must not contain surrounding whitespace.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.movementDate)) {
    throw new TypeError('Movement date must use YYYY-MM-DD.')
  }
  if (!input.createdBy.trim()) throw new TypeError('Created-by user ID is required.')
}

function minorUnitsToDecimal(value: string): string {
  if (!/^-?(0|[1-9]\d*)$/.test(value)) {
    throw new RangeError('Currency minor units must be an integer string.')
  }

  const amount = BigInt(value)
  const sign = amount < 0n ? '-' : ''
  const absolute = amount < 0n ? -amount : amount
  return `${sign}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`
}

function decimalToMinorUnits(value: string): string {
  if (!/^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.test(value)) {
    throw new RangeError('Database carrying value must be a non-negative decimal with at most 2 places.')
  }

  const [whole, fraction = ''] = value.split('.')
  return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))).toString()
}

/**
 * Transaction-scoped MWAC persistence.
 *
 * The caller owns the PostgreSQL transaction. This service never opens, commits,
 * or rolls back a transaction of its own. It deliberately does not post GL entries
 * or modify sales/purchases documents; those integrations are separate milestones.
 */
export class InventoryValuationService {
  async receive(tx: Database, input: ValuationReceiptInput) {
    assertSource(input)

    if (!/^(0|[1-9]\d*)$/.test(input.acquisitionValueMinorUnits)) {
      throw new RangeError('Acquisition value minor units must be a non-negative integer string.')
    }
    const acquisitionValue = minorUnitsToDecimal(input.acquisitionValueMinorUnits)
    const balance = await this.lockActiveBalance(tx, input.productId, input.warehouse)
    const transition = receiveMwac(
      {
        quantity: balance.quantity,
        carryingValueMinorUnits: decimalToMinorUnits(balance.carryingValue)
      },
      {
        quantity: input.quantity,
        acquisitionValueMinorUnits: input.acquisitionValueMinorUnits
      }
    )

    const [movement] = await tx.insert(inventoryMovements).values({
      productId: input.productId,
      movementDate: input.movementDate,
      type: 'purchase',
      quantity: input.quantity,
      warehouse: input.warehouse,
      remarks: input.remarks ?? null,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      createdBy: input.createdBy
    }).returning()

    if (!movement) throw new Error('Inventory receipt movement was not created.')

    const [event] = await tx.insert(inventoryValuationEvents).values({
      inventoryMovementId: movement.id,
      productId: input.productId,
      warehouse: input.warehouse,
      eventType: 'purchase',
      quantityDelta: input.quantity,
      valueDelta: acquisitionValue,
      quantityAfter: transition.balance.quantity,
      carryingValueAfter: minorUnitsToDecimal(transition.balance.carryingValueMinorUnits),
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      createdBy: input.createdBy
    }).returning()

    if (!event) throw new Error('Inventory valuation receipt event was not created.')

    const [updatedBalance] = await tx.update(inventoryValuationBalances).set({
      quantity: transition.balance.quantity,
      carryingValue: minorUnitsToDecimal(transition.balance.carryingValueMinorUnits),
      valuationStatus: 'active',
      lastEventId: event.id,
      version: sql`${inventoryValuationBalances.version} + 1`,
      updatedAt: new Date()
    }).where(eq(inventoryValuationBalances.id, balance.id)).returning()

    if (!updatedBalance) throw new Error('Inventory valuation balance was not updated.')

    return { movement, event, balance: updatedBalance }
  }

  async issue(tx: Database, input: ValuationIssueInput) {
    assertSource(input)

    const balance = await this.lockActiveBalance(tx, input.productId, input.warehouse)
    const transition = issueMwac(
      {
        quantity: balance.quantity,
        carryingValueMinorUnits: decimalToMinorUnits(balance.carryingValue)
      },
      { quantity: input.quantity }
    )

    const quantityDelta = `-${input.quantity}`
    const cogsMinorUnits = transition.cogsMinorUnits
    if (cogsMinorUnits === undefined) throw new Error('MWAC issue did not return a COGS value.')

    const [movement] = await tx.insert(inventoryMovements).values({
      productId: input.productId,
      movementDate: input.movementDate,
      type: 'sale',
      quantity: quantityDelta,
      warehouse: input.warehouse,
      remarks: input.remarks ?? null,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      createdBy: input.createdBy
    }).returning()

    if (!movement) throw new Error('Inventory issue movement was not created.')

    const [event] = await tx.insert(inventoryValuationEvents).values({
      inventoryMovementId: movement.id,
      productId: input.productId,
      warehouse: input.warehouse,
      eventType: 'sale',
      quantityDelta,
      valueDelta: minorUnitsToDecimal(`-${cogsMinorUnits}`),
      quantityAfter: transition.balance.quantity,
      carryingValueAfter: minorUnitsToDecimal(transition.balance.carryingValueMinorUnits),
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      createdBy: input.createdBy
    }).returning()

    if (!event) throw new Error('Inventory valuation issue event was not created.')

    const [updatedBalance] = await tx.update(inventoryValuationBalances).set({
      quantity: transition.balance.quantity,
      carryingValue: minorUnitsToDecimal(transition.balance.carryingValueMinorUnits),
      valuationStatus: 'active',
      lastEventId: event.id,
      version: sql`${inventoryValuationBalances.version} + 1`,
      updatedAt: new Date()
    }).where(eq(inventoryValuationBalances.id, balance.id)).returning()

    if (!updatedBalance) throw new Error('Inventory valuation balance was not updated.')

    return { movement, event, balance: updatedBalance, cogsMinorUnits }
  }

  private async lockActiveBalance(tx: Database, productId: string, warehouse: string) {
    // Use the same transaction-scoped lock as legacy quantity-only writers. The
    // unvalued-movement check below is only race-safe when every writer participates.
    await lockInventoryScopes(tx, [{ productId, warehouse }])

    await tx.insert(inventoryValuationBalances).values({
      productId,
      warehouse,
      quantity: '0.00',
      carryingValue: '0.00',
      valuationStatus: 'active',
      version: 0
    }).onConflictDoNothing({
      target: [inventoryValuationBalances.productId, inventoryValuationBalances.warehouse]
    })

    const [balance] = await tx.select().from(inventoryValuationBalances).where(and(
      eq(inventoryValuationBalances.productId, productId),
      eq(inventoryValuationBalances.warehouse, warehouse)
    )).for('update')

    if (!balance) throw new Error('Inventory valuation balance could not be locked.')
    if (balance.valuationStatus !== 'active') {
      throw new Error('Inventory valuation balance is uninitialized; owner-approved opening valuation is required.')
    }

    // An active projection must never silently absorb quantity movements created
    // by the legacy posting path. Every movement in this product/warehouse scope
    // must already have its immutable valuation event before another valued write.
    const [unvaluedMovement] = await tx.select({ id: inventoryMovements.id })
      .from(inventoryMovements)
      .leftJoin(
        inventoryValuationEvents,
        eq(inventoryValuationEvents.inventoryMovementId, inventoryMovements.id)
      )
      .where(and(
        eq(inventoryMovements.productId, productId),
        eq(inventoryMovements.warehouse, warehouse),
        isNull(inventoryValuationEvents.id)
      ))
      .limit(1)

    if (unvaluedMovement) {
      throw new Error('Inventory contains an unvalued legacy movement; reconciliation is required before MWAC posting.')
    }

    return balance
  }
}

export const inventoryValuationService = new InventoryValuationService()
