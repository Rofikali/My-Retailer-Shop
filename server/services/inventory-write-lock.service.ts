import { sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { and, eq } from 'drizzle-orm'
import { inventoryValuationBalances } from '../db/schema'

export interface InventoryScope {
  productId: string
  warehouse: string
}

/**
 * Serialize every stock writer for the same product/warehouse, including legacy
 * quantity-only writes and MWAC writes. PostgreSQL releases these transaction
 * locks automatically on commit or rollback.
 *
 * Sort keys before acquiring more than one lock so overlapping multi-item
 * transactions use the same lock order and reduce deadlock risk.
 */
export async function lockInventoryScopes(tx: Database, scopes: InventoryScope[]) {
  const uniqueScopes = new Map<string, InventoryScope>()

  for (const scope of scopes) {
    if (!scope.productId.trim()) throw new TypeError('Inventory product ID is required.')
    if (!scope.warehouse.trim() || scope.warehouse !== scope.warehouse.trim()) {
      throw new TypeError('Inventory warehouse must be non-empty and normalized.')
    }
    uniqueScopes.set(`${scope.productId}\u0000${scope.warehouse}`, scope)
  }

  const ordered = [...uniqueScopes.values()].sort((a, b) =>
    a.productId.localeCompare(b.productId) || a.warehouse.localeCompare(b.warehouse)
  )

  for (const scope of ordered) {
    const lockKey = `retailshop:inventory:${scope.productId}:${scope.warehouse}`
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`)
  }
}

/**
 * Once a scope has at least one MWAC event, legacy quantity-only writes would
 * make its valuation projection stale. Such writes must use the valuation path.
 * Uninitialized legacy scopes remain writable only through the legacy path until
 * an owner-approved opening valuation is completed.
 */
export async function assertLegacyInventoryWriteAllowed(tx: Database, scopes: InventoryScope[]) {
  const uniqueScopes = new Map<string, InventoryScope>()
  for (const scope of scopes) {
    uniqueScopes.set(`${scope.productId}\\u0000${scope.warehouse}`, scope)
  }

  for (const scope of [...uniqueScopes.values()].sort((a, b) =>
    a.productId.localeCompare(b.productId) || a.warehouse.localeCompare(b.warehouse)
  )) {
    const [balance] = await tx.select({
      valuationStatus: inventoryValuationBalances.valuationStatus,
      version: inventoryValuationBalances.version,
      lastEventId: inventoryValuationBalances.lastEventId
    }).from(inventoryValuationBalances).where(and(
      eq(inventoryValuationBalances.productId, scope.productId),
      eq(inventoryValuationBalances.warehouse, scope.warehouse)
    ))

    if (balance?.valuationStatus === 'active' && (balance.version > 0 || balance.lastEventId !== null)) {
      throw new Error(`Inventory ${scope.productId} in ${scope.warehouse} has active valuation; use the MWAC posting path.`)
    }
  }
}
