import { eq, and, lte, lt, gte, sql, inArray } from 'drizzle-orm'
import type { Database } from '../db/client'
import { ledgerEntries, accounts } from '../db/schema'

export interface PostLine {
  accountCode: string
  debit?: number
  credit?: number
  customerId?: string
  supplierId?: string
}

export interface PostOptions {
  entryDate: string
  description?: string
  referenceType: typeof ledgerEntries.$inferInsert['referenceType']
  referenceId?: string
  customerId?: string
  supplierId?: string
  createdBy: string
}

export class LedgerRepo {
  constructor(private db: Database) {}

  /** Look up an account id by its chart-of-accounts code. Throws if not found - a missing
   *  account code is a seed/config bug, not a runtime condition to handle gracefully. */
  async getAccountIdByCode(code: string): Promise<string> {
    const [account] = await this.db.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, code))
    if (!account) throw new Error(`Unknown chart-of-accounts code: ${code}. Check seed.ts.`)
    return account.id
  }

  /** Insert a balanced set of ledger lines. Caller (LedgerService) is responsible for
   *  running this inside a transaction alongside the source document insert. */
  async insertLines(tx: Database, lines: PostLine[], opts: PostOptions) {
    const rows = await Promise.all(
      lines.map(async (line) => ({
        entryDate: opts.entryDate,
        accountId: await this.getAccountIdByCode(line.accountCode),
        debit: String(line.debit ?? 0),
        credit: String(line.credit ?? 0),
        description: opts.description,
        referenceType: opts.referenceType,
        referenceId: opts.referenceId,
        customerId: line.customerId,
        supplierId: line.supplierId,
        createdBy: opts.createdBy
      }))
    )
    return tx.insert(ledgerEntries).values(rows).returning()
  }

  /** Net balance (debit - credit) for one or more account codes, optionally as-of a date.
   *  This is the single query every report is built on top of. */
  async getBalanceByAccountCodes(codes: string[], asOfDate?: string): Promise<number> {
    const acctIds = await this.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(inArray(accounts.code, codes))
    const ids = acctIds.map((a) => a.id)
    if (ids.length === 0) return 0

    const conditions = [inArray(ledgerEntries.accountId, ids)]
    if (asOfDate) conditions.push(lte(ledgerEntries.entryDate, asOfDate))

    const [row] = await this.db
      .select({
        net: sql<string>`COALESCE(SUM(${ledgerEntries.debit}) - SUM(${ledgerEntries.credit}), 0)`
      })
      .from(ledgerEntries)
      .where(and(...conditions))

    return Number(row?.net ?? 0)
  }

  async getBalanceBeforeAccountCodes(codes: string[], beforeDate: string): Promise<number> {
    const acctIds = await this.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(inArray(accounts.code, codes))
    const ids = acctIds.map((account) => account.id)
    if (ids.length === 0) return 0

    const [row] = await this.db
      .select({
        net: sql<string>`COALESCE(SUM(${ledgerEntries.debit}) - SUM(${ledgerEntries.credit}), 0)`
      })
      .from(ledgerEntries)
      .where(and(inArray(ledgerEntries.accountId, ids), lt(ledgerEntries.entryDate, beforeDate)))

    return Number(row?.net ?? 0)
  }

  /** Grouped balances by account, for Trial Balance / P&L / Balance Sheet. */
  async getBalancesByType(type: string, from?: string, to?: string) {
    const conditions = [eq(accounts.type, type as any)]
    if (from) conditions.push(gte(ledgerEntries.entryDate, from))
    if (to) conditions.push(lte(ledgerEntries.entryDate, to))

    return this.db
      .select({
        accountCode: accounts.code,
        accountName: accounts.name,
        debit: sql<string>`COALESCE(SUM(${ledgerEntries.debit}), 0)`,
        credit: sql<string>`COALESCE(SUM(${ledgerEntries.credit}), 0)`
      })
      .from(ledgerEntries)
      .innerJoin(accounts, eq(ledgerEntries.accountId, accounts.id))
      .where(and(...conditions))
      .groupBy(accounts.code, accounts.name)
  }
}
