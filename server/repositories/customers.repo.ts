import { eq, asc, desc, ilike, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { customers, ledgerEntries } from '../db/schema'

export class CustomersRepo {
  constructor(private db: Database) {}

  async list(search?: string) {
    return this.db
      .select()
      .from(customers)
      .where(search ? ilike(customers.name, `%${search}%`) : undefined)
      .orderBy(asc(customers.name))
  }

  async getById(id: string) {
    const [row] = await this.db.select().from(customers).where(eq(customers.id, id))
    return row ?? null
  }

  async insert(values: typeof customers.$inferInsert) {
    const [row] = await this.db.insert(customers).values(values).returning()
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
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.customerId, customerId))
      .orderBy(asc(ledgerEntries.entryDate), asc(ledgerEntries.createdAt))
  }
}
