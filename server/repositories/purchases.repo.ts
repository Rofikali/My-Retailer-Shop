import { and, desc, eq, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { inventoryMovements, products, purchaseItems, purchases, suppliers } from '../db/schema'

export class PurchasesRepo {
  constructor(private db: Database) {}

  async list() {
    return this.db
      .select({
        id: purchases.id,
        purchaseNo: purchases.purchaseNo,
        purchaseDate: purchases.purchaseDate,
        productName: products.name,
        category: products.category,
        quantity: purchaseItems.quantity,
        unitCost: purchaseItems.unitCost,
        discount: purchaseItems.discount,
        paymentMode: purchases.paymentMode,
        status: purchases.status,
        supplierName: suppliers.name,
        warehouse: purchases.warehouse,
        referenceNo: purchases.referenceNo,
        remarks: purchases.remarks,
        stockUpdated: sql<boolean>`${inventoryMovements.id} IS NOT NULL`,
        createdAt: purchases.createdAt
      })
      .from(purchases)
      .innerJoin(purchaseItems, eq(purchaseItems.purchaseId, purchases.id))
      .innerJoin(products, eq(purchaseItems.productId, products.id))
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .leftJoin(inventoryMovements, and(
        eq(inventoryMovements.referenceId, purchases.id),
        eq(inventoryMovements.productId, purchaseItems.productId),
        eq(inventoryMovements.type, 'purchase')
      ))
      .orderBy(desc(purchases.purchaseDate), desc(purchases.createdAt))
  }

  async getById(id: string) {
    const [purchase] = await this.db
      .select({
        id: purchases.id,
        purchaseNo: purchases.purchaseNo,
        purchaseDate: purchases.purchaseDate,
        paymentMode: purchases.paymentMode,
        status: purchases.status,
        supplierId: purchases.supplierId,
        supplierName: suppliers.name,
        warehouse: purchases.warehouse,
        referenceNo: purchases.referenceNo,
        remarks: purchases.remarks
      })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(eq(purchases.id, id))
    if (!purchase) return null

    const items = await this.db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id))
    return { ...purchase, items }
  }

  async insertPurchase(tx: Database, values: typeof purchases.$inferInsert) {
    const [row] = await tx.insert(purchases).values(values).returning()
    if (!row) throw new Error('Purchase was not created.')
    return row
  }

  async insertItems(tx: Database, values: (typeof purchaseItems.$inferInsert)[]) {
    return tx.insert(purchaseItems).values(values).returning()
  }

  async nextPurchaseNo(): Promise<string> {
    const [row] = await this.db.select().from(purchases).orderBy(desc(purchases.createdAt)).limit(1)
    const lastNum = row ? parseInt(row.purchaseNo.replace(/\D/g, ''), 10) || 0 : 0
    return `PUR-${String(lastNum + 1).padStart(4, '0')}`
  }
}
