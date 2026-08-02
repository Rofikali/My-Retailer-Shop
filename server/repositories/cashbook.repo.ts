import { and, gte, lte, desc, eq } from 'drizzle-orm'
import type { Database } from '../db/client'
import { cashTxns } from '../db/schema'

export class CashBookRepo {
  constructor(private db: Database) {}

  async list(filters: { from?: string; to?: string; category?: string; page: number; pageSize: number }) {
    const conditions = []
    if (filters.from) conditions.push(gte(cashTxns.txnDate, filters.from))
    if (filters.to) conditions.push(lte(cashTxns.txnDate, filters.to))
    if (filters.category) conditions.push(eq(cashTxns.category, filters.category as any))

    const rows = await this.db
      .select()
      .from(cashTxns)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(cashTxns.txnDate), desc(cashTxns.createdAt))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize)

    return rows
  }

  async insert(tx: Database, values: typeof cashTxns.$inferInsert) {
    const [row] = await tx.insert(cashTxns).values(values).returning()
    return row
  }

  async nextVoucherNo(): Promise<string> {
    const [row] = await this.db.select().from(cashTxns).orderBy(desc(cashTxns.createdAt)).limit(1)
    const lastNum = row ? parseInt(row.voucherNo.replace(/\D/g, ''), 10) || 0 : 0
    return `CB-${String(lastNum + 1).padStart(4, '0')}`
  }
}
