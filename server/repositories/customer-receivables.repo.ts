import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { customerReceiptAllocations, saleItems, sales } from '../db/schema'

export class CustomerReceivablesRepo {
  constructor(private db: Database) {}

  private invoiceSelect() {
    return {
      id: sales.id,
      invoiceNo: sales.invoiceNo,
      saleDate: sales.saleDate,
      dueDate: sales.dueDate,
      customerId: sales.customerId,
      paymentMode: sales.paymentMode,
      storedStatus: sales.status,
      total: sql<string>`COALESCE((SELECT SUM(${saleItems.quantity} * ${saleItems.sellingPrice} - ${saleItems.discount}) FROM ${saleItems} WHERE ${saleItems.saleId} = ${sales.id}), 0)`,
      allocated: sql<string>`COALESCE((SELECT SUM(${customerReceiptAllocations.amount}) FROM ${customerReceiptAllocations} WHERE ${customerReceiptAllocations.saleId} = ${sales.id}), 0)`
    }
  }

  listCreditInvoices(customerId: string) {
    return this.db.select(this.invoiceSelect()).from(sales)
      .where(and(eq(sales.customerId, customerId), eq(sales.paymentMode, 'credit')))
  }

  getCreditInvoices(tx: Database, customerId: string, invoiceIds: string[]) {
    return tx.select(this.invoiceSelect()).from(sales)
      .where(and(eq(sales.customerId, customerId), eq(sales.paymentMode, 'credit'), inArray(sales.id, invoiceIds)))
  }

  getCreditInvoicesByIds(invoiceIds: string[]) {
    if (!invoiceIds.length) return Promise.resolve([])
    return this.db.select(this.invoiceSelect()).from(sales)
      .where(and(eq(sales.paymentMode, 'credit'), inArray(sales.id, invoiceIds)))
  }

  insertAllocations(tx: Database, values: (typeof customerReceiptAllocations.$inferInsert)[]) {
    if (!values.length) return Promise.resolve([])
    return tx.insert(customerReceiptAllocations).values(values).returning()
  }
}
