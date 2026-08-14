import { eq, sql, asc } from 'drizzle-orm'
import type { Database } from '../db/client'
import { products, inventoryMovements, purchases, suppliers } from '../db/schema'

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
        lastMovementDate: sql<string | null>`MAX(${inventoryMovements.movementDate})`,
        openingStock: sql<string>`COALESCE(SUM(CASE WHEN ${inventoryMovements.type} = 'opening' THEN ${inventoryMovements.quantity} ELSE 0 END), 0)`,
        stockIn: sql<string>`COALESCE(SUM(CASE WHEN ${inventoryMovements.type} = 'purchase' OR (${inventoryMovements.type} = 'adjustment' AND ${inventoryMovements.quantity} > 0) THEN ${inventoryMovements.quantity} ELSE 0 END), 0)`,
        stockOut: sql<string>`COALESCE(SUM(CASE WHEN ${inventoryMovements.type} = 'sale' OR (${inventoryMovements.type} = 'adjustment' AND ${inventoryMovements.quantity} < 0) THEN -${inventoryMovements.quantity} ELSE 0 END), 0)`,
        damaged: sql<string>`COALESCE(SUM(CASE WHEN ${inventoryMovements.type} = 'damage' THEN -${inventoryMovements.quantity} ELSE 0 END), 0)`,
        currentStock: sql<string>`COALESCE(SUM(${inventoryMovements.quantity}), 0)`,
        warehouse: sql<string>`COALESCE(${inventoryMovements.warehouse}, 'Main')`,
        supplierName: sql<string | null>`(
          SELECT ${suppliers.name} FROM ${inventoryMovements} latest_purchase
          INNER JOIN ${purchases} ON ${purchases.id} = latest_purchase.reference_id
          INNER JOIN ${suppliers} ON ${suppliers.id} = ${purchases.supplierId}
          WHERE latest_purchase.product_id = ${products.id}
            AND latest_purchase.warehouse = ${inventoryMovements.warehouse}
            AND latest_purchase.type = 'purchase'
          ORDER BY latest_purchase.movement_date DESC, latest_purchase.created_at DESC LIMIT 1
        )`,
        remarks: sql<string | null>`(
          SELECT latest_movement.remarks FROM ${inventoryMovements} latest_movement
          WHERE latest_movement.product_id = ${products.id}
            AND latest_movement.warehouse = ${inventoryMovements.warehouse}
          ORDER BY latest_movement.movement_date DESC, latest_movement.created_at DESC LIMIT 1
        )`
      })
      .from(products)
      .leftJoin(inventoryMovements, eq(inventoryMovements.productId, products.id))
      .groupBy(products.id, inventoryMovements.warehouse)
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
