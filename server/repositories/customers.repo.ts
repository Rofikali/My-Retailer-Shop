import { alias } from 'drizzle-orm/pg-core'
import { and, eq, asc, desc, ilike, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { customers, ledgerEntries, sales, users } from '../db/schema'

const assignee = alias(users, 'customer_assignee')
const enteredBy = alias(users, 'customer_ledger_entered_by')
const salesperson = alias(users, 'customer_ledger_salesperson')

export class CustomersRepo {
  constructor(private db: Database) {}

  async list(search?: string) {
    return this.db
      .select({
        id: customers.id,
        code: customers.code,
        name: customers.name,
        company: customers.company,
        phone: customers.phone,
        email: customers.email,
        gstin: customers.gstin,
        address: customers.address,
        city: customers.city,
        state: customers.state,
        pinCode: customers.pinCode,
        openingBalance: customers.openingBalance,
        creditLimit: customers.creditLimit,
        status: customers.status,
        createdAt: customers.createdAt,
        remarks: customers.remarks,
        assignedToName: assignee.name,
        lastTransaction: sql<string | null>`(SELECT MAX(${ledgerEntries.entryDate}) FROM ${ledgerEntries} WHERE ${ledgerEntries.customerId} = ${customers.id})`
      })
      .from(customers)
      .leftJoin(assignee, eq(customers.assignedTo, assignee.id))
      .where(search ? ilike(customers.name, `%${search}%`) : undefined)
      .orderBy(asc(customers.name))
  }

  async getById(id: string) {
    const [row] = await this.db.select().from(customers).where(eq(customers.id, id))
    return row ?? null
  }

  async insert(tx: Database, values: typeof customers.$inferInsert) {
    const [row] = await tx.insert(customers).values(values).returning()
    return row
  }

  async nextCode(): Promise<string> {
    const [row] = await this.db.select().from(customers).orderBy(desc(customers.createdAt)).limit(1)
    const lastNum = row ? parseInt(row.code.replace(/\D/g, ''), 10) || 0 : 0
    return `CUST-${String(lastNum + 1).padStart(4, '0')}`
  }

  /** Outstanding balance = net Debit - Credit across every ledger_entries row tagged
   *  with this customer's id. This is the same "net over the whole ledger" approach
   *  used for the Balance Sheet - never a separately stored, driftable balance. */
  async getOutstandingBalance(customerId: string): Promise<number> {
    const [row] = await this.db
      .select({
        net: sql<string>`COALESCE(SUM(${ledgerEntries.debit}) - SUM(${ledgerEntries.credit}), 0)`
      })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.customerId, customerId))
    return Number(row?.net ?? 0)
  }

  async getLedger(customerId: string) {
    return this.db
      .select({
        id: ledgerEntries.id,
        entryDate: ledgerEntries.entryDate,
        voucherNo: sql<string>`CASE WHEN ${sales.invoiceNo} IS NOT NULL THEN 'SLS-' || ${sales.invoiceNo} ELSE 'VCH-' || SUBSTRING(${ledgerEntries.id}::text, 1, 8) END`,
        invoiceNo: sales.invoiceNo,
        particulars: ledgerEntries.description,
        debit: ledgerEntries.debit,
        credit: ledgerEntries.credit,
        paymentMode: sales.paymentMode,
        referenceNo: sales.referenceNo,
        dueDate: sql<string | null>`NULL`,
        status: sql<string>`COALESCE(${sales.status}::text, 'posted')`,
        salespersonName: salesperson.name,
        remarks: sales.remarks,
        enteredByName: enteredBy.name,
        approvedByName: enteredBy.name,
        createdAt: ledgerEntries.createdAt
      })
      .from(ledgerEntries)
      .leftJoin(sales, and(eq(ledgerEntries.referenceId, sales.id), eq(ledgerEntries.referenceType, 'sale')))
      .leftJoin(enteredBy, eq(ledgerEntries.createdBy, enteredBy.id))
      .leftJoin(salesperson, eq(sales.createdBy, salesperson.id))
      .where(eq(ledgerEntries.customerId, customerId))
      .orderBy(asc(ledgerEntries.entryDate), asc(ledgerEntries.createdAt))
  }
}
