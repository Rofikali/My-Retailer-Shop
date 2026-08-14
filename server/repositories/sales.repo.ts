import { eq, desc } from 'drizzle-orm'
import type { Database } from '../db/client'
import { sales, saleItems, customers, products, users } from '../db/schema'

export class SalesRepo {
  constructor(private db: Database) {}

  async list() {
    return this.db
      .select({
        id: sales.id,
        invoiceNo: sales.invoiceNo,
        saleDate: sales.saleDate,
        productName: products.name,
        category: products.category,
        quantity: saleItems.quantity,
        costPrice: saleItems.costPrice,
        unitPrice: saleItems.sellingPrice,
        discount: saleItems.discount,
        paymentMode: sales.paymentMode,
        status: sales.status,
        customerName: customers.name,
        salespersonName: users.name,
        referenceNo: sales.referenceNo,
        remarks: sales.remarks,
        createdAt: sales.createdAt
      })
      .from(sales)
      .innerJoin(saleItems, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(users, eq(sales.createdBy, users.id))
      .orderBy(desc(sales.saleDate), desc(sales.createdAt))
  }

  async getById(id: string) {
    const [sale] = await this.db
      .select({
        id: sales.id,
        invoiceNo: sales.invoiceNo,
        saleDate: sales.saleDate,
        paymentMode: sales.paymentMode,
        status: sales.status,
        customerId: sales.customerId,
        customerName: customers.name,
        salespersonName: users.name,
        referenceNo: sales.referenceNo,
        remarks: sales.remarks
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(users, eq(sales.createdBy, users.id))
      .where(eq(sales.id, id))
    if (!sale) return null

    const items = await this.db.select().from(saleItems).where(eq(saleItems.saleId, id))
    return { ...sale, items }
  }

  async insertSale(tx: Database, values: typeof sales.$inferInsert) {
    const [row] = await tx.insert(sales).values(values).returning()
    if (!row) throw new Error('Sale was not created.')
    return row
  }

  async insertItems(tx: Database, values: (typeof saleItems.$inferInsert)[]) {
    return tx.insert(saleItems).values(values).returning()
  }

  async nextInvoiceNo(): Promise<string> {
    const [row] = await this.db.select().from(sales).orderBy(desc(sales.createdAt)).limit(1)
    const year = new Date().getFullYear()
    const lastNum = row ? parseInt(row.invoiceNo.split('-').pop() || '0', 10) || 0 : 0
    return `${year}-${String(lastNum + 1).padStart(4, '0')}`
  }
}
