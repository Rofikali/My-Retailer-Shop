import { eq, desc } from 'drizzle-orm'
import type { Database } from '../db/client'
import { purchases, purchaseItems, suppliers } from '../db/schema'

export class PurchasesRepo {
  constructor(private db: Database) {}

  async list() {
    return this.db
      .select({
        id: purchases.id,
        purchaseNo: purchases.purchaseNo,
        purchaseDate: purchases.purchaseDate,
        paymentMode: purchases.paymentMode,
        status: purchases.status,
        supplierName: suppliers.name,
        createdAt: purchases.createdAt
      })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
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
        supplierName: suppliers.name
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
