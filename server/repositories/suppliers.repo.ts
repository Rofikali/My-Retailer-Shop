import { eq, asc, desc, ilike, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { suppliers, ledgerEntries } from '../db/schema'

export class SuppliersRepo {
  constructor(private db: Database) {}

  async list(search?: string) {
    return this.db
      .select()
      .from(suppliers)
      .where(search ? ilike(suppliers.name, `%${search}%`) : undefined)
      .orderBy(asc(suppliers.name))
  }

  async getById(id: string) {
    const [row] = await this.db.select().from(suppliers).where(eq(suppliers.id, id))
    return row ?? null
  }

  async insert(values: typeof suppliers.$inferInsert) {
    const [row] = await this.db.insert(suppliers).values(values).returning()
    return row
  }

  async nextCode(): Promise<string> {
    const [row] = await this.db.select().from(suppliers).orderBy(desc(suppliers.createdAt)).limit(1)
    const lastNum = row ? parseInt(row.code.replace(/\D/g, ''), 10) || 0 : 0
    return `SUP-${String(lastNum + 1).padStart(4, '0')}`
  }

  /** Creditors are credit-normal, so outstanding = net Credit - Debit (opposite sign
   *  convention from Customers' Debit - Credit). Same "sum the whole ledger" approach -
   *  never a separately stored, driftable balance. */
  async getOutstandingBalance(supplierId: string): Promise<number> {
    const [row] = await this.db
      .select({
        net: sql<string>`COALESCE(SUM(${ledgerEntries.credit}) - SUM(${ledgerEntries.debit}), 0)`
      })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.supplierId, supplierId))
    return Number(row?.net ?? 0)
  }

  async getLedger(supplierId: string) {
    return this.db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.supplierId, supplierId))
      .orderBy(asc(ledgerEntries.entryDate), asc(ledgerEntries.createdAt))
  }
}
