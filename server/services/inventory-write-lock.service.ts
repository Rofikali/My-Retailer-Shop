import { sql } from 'drizzle-orm'
import type { Database } from '../db/client'

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
