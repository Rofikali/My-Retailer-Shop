import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { purchaseItems, purchases, supplierPaymentAllocations } from '../db/schema'

export class SupplierPayablesRepo {
  constructor(private db: Database) {}
  private selectInvoice() {
    return {
      id: purchases.id, purchaseNo: purchases.purchaseNo, purchaseDate: purchases.purchaseDate, dueDate: purchases.dueDate, supplierId: purchases.supplierId,
      total: sql<string>`COALESCE((SELECT SUM(${purchaseItems.quantity} * ${purchaseItems.unitCost} - ${purchaseItems.discount}) FROM ${purchaseItems} WHERE ${purchaseItems.purchaseId} = ${purchases.id}), 0)`,
      allocated: sql<string>`COALESCE((SELECT SUM(${supplierPaymentAllocations.amount}) FROM ${supplierPaymentAllocations} WHERE ${supplierPaymentAllocations.purchaseId} = ${purchases.id}), 0)`
    }
  }
  listCreditPurchases(supplierId: string) { return this.db.select(this.selectInvoice()).from(purchases).where(and(eq(purchases.supplierId, supplierId), eq(purchases.paymentMode, 'credit'))) }
  getCreditPurchases(tx: Database, supplierId: string, ids: string[]) { return tx.select(this.selectInvoice()).from(purchases).where(and(eq(purchases.supplierId, supplierId), eq(purchases.paymentMode, 'credit'), inArray(purchases.id, ids))) }
  insertAllocations(tx: Database, values: (typeof supplierPaymentAllocations.$inferInsert)[]) { return values.length ? tx.insert(supplierPaymentAllocations).values(values).returning() : Promise.resolve([]) }
}
