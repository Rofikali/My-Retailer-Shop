import { eq, sql, asc } from 'drizzle-orm'
import type { Database } from '../db/client'
import { products, inventoryMovements } from '../db/schema'

export class InventoryRepo {
  constructor(private db: Database) {}

  /** Current stock is never a stored column - always SUM(quantity) over the
   *  append-only inventory_movements table, computed live. */
  async listWithStock() {
    return this.db
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        category: products.category,
        unit: products.unit,
        reorderLevel: products.reorderLevel,
        costPrice: products.costPrice,
        sellingPrice: products.sellingPrice,
        currentStock: sql<string>`COALESCE(SUM(${inventoryMovements.quantity}), 0)`
      })
      .from(products)
      .leftJoin(inventoryMovements, eq(inventoryMovements.productId, products.id))
      .groupBy(products.id)
      .orderBy(asc(products.name))
  }

  async getMovements(productId: string) {
    return this.db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.productId, productId))
      .orderBy(asc(inventoryMovements.movementDate), asc(inventoryMovements.createdAt))
  }

  async getCurrentStock(productId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${inventoryMovements.quantity}), 0)` })
      .from(inventoryMovements)
      .where(eq(inventoryMovements.productId, productId))
    return Number(row?.total ?? 0)
  }

  async insertMovement(tx: Database, values: typeof inventoryMovements.$inferInsert) {
    const [row] = await tx.insert(inventoryMovements).values(values).returning()
    if (!row) throw new Error('Inventory movement was not created.')
    return row
  }
}
