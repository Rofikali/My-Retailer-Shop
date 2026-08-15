import { alias } from 'drizzle-orm/pg-core'
import { and, eq, asc, desc, ilike, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { customers, ledgerEntries, partyLedgerEvents, users } from '../db/schema'

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
        lastTransaction: sql<string | null>`(SELECT MAX(${partyLedgerEvents.entryDate}) FROM ${partyLedgerEvents} WHERE ${partyLedgerEvents.customerId} = ${customers.id})`
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

  async update(id: string, values: Partial<typeof customers.$inferInsert>) {
    const [row] = await this.db.update(customers).set(values).where(eq(customers.id, id)).returning()
    return row ?? null
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
        id: partyLedgerEvents.id,
        entryDate: partyLedgerEvents.entryDate,
        voucherNo: partyLedgerEvents.voucherNo,
        invoiceNo: partyLedgerEvents.invoiceNo,
        particulars: partyLedgerEvents.particulars,
        debit: partyLedgerEvents.debit,
        credit: partyLedgerEvents.credit,
        paymentMode: partyLedgerEvents.paymentMode,
        referenceNo: partyLedgerEvents.referenceNo,
        dueDate: partyLedgerEvents.dueDate,
        status: partyLedgerEvents.status,
        salespersonName: salesperson.name,
        remarks: partyLedgerEvents.remarks,
        enteredByName: enteredBy.name,
        approvedByName: enteredBy.name,
        createdAt: partyLedgerEvents.createdAt
      })
      .from(partyLedgerEvents)
      .leftJoin(enteredBy, eq(partyLedgerEvents.createdBy, enteredBy.id))
      .leftJoin(salesperson, eq(partyLedgerEvents.salespersonId, salesperson.id))
      .where(eq(partyLedgerEvents.customerId, customerId))
      .orderBy(asc(partyLedgerEvents.entryDate), asc(partyLedgerEvents.createdAt))
  }
}
