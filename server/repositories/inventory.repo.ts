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

  /** Read-only migration preflight. It reports quantity and provenance gaps only;
   *  it deliberately does not infer carrying values from mutable product.costPrice. */
  async valuationPreflight() {
    return this.db.execute<{
      product_id: string
      product_code: string
      product_name: string
      warehouse: string
      current_quantity: string
      movement_count: number
      purchase_movement_count: number
      sale_movement_count: number
      manual_movement_count: number
      unlinked_source_movement_count: number
      source_quantity_mismatch_movement_count: number
      purchase_warehouse_mismatch_movement_count: number
    }>(sql`
      WITH movement_totals AS (
        SELECT
          im.product_id,
          im.warehouse,
          SUM(im.quantity)::text AS current_quantity,
          COUNT(*)::int AS movement_count,
          COUNT(*) FILTER (WHERE im.type = 'purchase')::int AS purchase_movement_count,
          COUNT(*) FILTER (WHERE im.type = 'sale')::int AS sale_movement_count,
          COUNT(*) FILTER (WHERE im.type IN ('opening', 'damage', 'adjustment'))::int AS manual_movement_count,
          (COUNT(*) FILTER (
            WHERE im.type = 'purchase' AND (
              im.reference_id IS NULL OR im.reference_type IS DISTINCT FROM 'purchase' OR NOT EXISTS (
                SELECT 1 FROM purchase_items pi
                WHERE pi.purchase_id = im.reference_id AND pi.product_id = im.product_id
              )
            )
          ) + COUNT(*) FILTER (
            WHERE im.type = 'sale' AND (
              im.reference_id IS NULL OR im.reference_type IS DISTINCT FROM 'sale' OR NOT EXISTS (
                SELECT 1 FROM sale_items si
                WHERE si.sale_id = im.reference_id AND si.product_id = im.product_id
              )
            )
          ))::int AS unlinked_source_movement_count,
          COUNT(*) FILTER (
            WHERE im.type = 'purchase'
              AND im.reference_id IS NOT NULL
              AND im.reference_type = 'purchase'
              AND EXISTS (
                SELECT 1 FROM purchases p
                WHERE p.id = im.reference_id
                  AND COALESCE((
                    SELECT SUM(m.quantity) FROM inventory_movements m
                    WHERE m.type = 'purchase' AND m.reference_id = im.reference_id AND m.product_id = im.product_id
                  ), 0) IS DISTINCT FROM COALESCE((
                    SELECT SUM(pi.quantity) FROM purchase_items pi
                    WHERE pi.purchase_id = im.reference_id AND pi.product_id = im.product_id
                  ), 0)
              )
            OR im.type = 'sale'
              AND im.reference_id IS NOT NULL
              AND im.reference_type = 'sale'
              AND EXISTS (
                SELECT 1 FROM sales s
                WHERE s.id = im.reference_id
                  AND -COALESCE((
                    SELECT SUM(m.quantity) FROM inventory_movements m
                    WHERE m.type = 'sale' AND m.reference_id = im.reference_id AND m.product_id = im.product_id
                  ), 0) IS DISTINCT FROM COALESCE((
                    SELECT SUM(si.quantity) FROM sale_items si
                    WHERE si.sale_id = im.reference_id AND si.product_id = im.product_id
                  ), 0)
              )
          )::int AS source_quantity_mismatch_movement_count,
          COUNT(*) FILTER (
            WHERE im.type = 'purchase'
              AND im.reference_id IS NOT NULL
              AND im.reference_type = 'purchase'
              AND EXISTS (
                SELECT 1 FROM purchases p
                WHERE p.id = im.reference_id AND p.warehouse IS DISTINCT FROM im.warehouse
              )
          )::int AS purchase_warehouse_mismatch_movement_count
        FROM inventory_movements im
        GROUP BY im.product_id, im.warehouse
      ), product_warehouses AS (
        SELECT product_id, warehouse FROM movement_totals
        UNION
        SELECT p.id, COALESCE((SELECT default_warehouse FROM business_profile LIMIT 1), 'Main')
        FROM products p
        WHERE NOT EXISTS (SELECT 1 FROM inventory_movements im WHERE im.product_id = p.id)
      )
      SELECT
        p.id AS product_id,
        p.code AS product_code,
        p.name AS product_name,
        pw.warehouse,
        COALESCE(mt.current_quantity, '0') AS current_quantity,
        COALESCE(mt.movement_count, 0)::int AS movement_count,
        COALESCE(mt.purchase_movement_count, 0)::int AS purchase_movement_count,
        COALESCE(mt.sale_movement_count, 0)::int AS sale_movement_count,
        COALESCE(mt.manual_movement_count, 0)::int AS manual_movement_count,
        COALESCE(mt.unlinked_source_movement_count, 0)::int AS unlinked_source_movement_count,
        COALESCE(mt.source_quantity_mismatch_movement_count, 0)::int AS source_quantity_mismatch_movement_count,
        COALESCE(mt.purchase_warehouse_mismatch_movement_count, 0)::int AS purchase_warehouse_mismatch_movement_count
      FROM product_warehouses pw
      INNER JOIN products p ON p.id = pw.product_id
      LEFT JOIN movement_totals mt
        ON mt.product_id = pw.product_id AND mt.warehouse = pw.warehouse
      ORDER BY p.name, pw.warehouse
    `)
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
