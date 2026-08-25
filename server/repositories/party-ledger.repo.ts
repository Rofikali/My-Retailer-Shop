import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import type { Database } from '../db/client'
import { partyLedgerAmendments, partyLedgerEvents } from '../db/schema'

export class PartyLedgerRepo {
  constructor(private db: Database) {}

  async insert(tx: Database, values: typeof partyLedgerEvents.$inferInsert) {
    const [entry] = await tx.insert(partyLedgerEvents).values(values).returning()
    return entry
  }

  async getByCustomerId(customerId: string) {
    return this.db.select().from(partyLedgerEvents)
      .where(eq(partyLedgerEvents.customerId, customerId))
      .orderBy(asc(partyLedgerEvents.entryDate), asc(partyLedgerEvents.createdAt))
  }

  async getBySupplierId(supplierId: string) {
    return this.db.select().from(partyLedgerEvents)
      .where(eq(partyLedgerEvents.supplierId, supplierId))
      .orderBy(asc(partyLedgerEvents.entryDate), asc(partyLedgerEvents.createdAt))
  }

  async getOpeningEntriesForReference(tx: Database, referenceId: string) {
    return tx.select().from(partyLedgerEvents)
      .where(and(eq(partyLedgerEvents.referenceId, referenceId), eq(partyLedgerEvents.referenceType, 'opening_balance')))
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(partyLedgerEvents).where(eq(partyLedgerEvents.id, id))
    return row ?? null
  }

  async insertAmendment(tx: Database, values: typeof partyLedgerAmendments.$inferInsert) {
    const [row] = await tx.insert(partyLedgerAmendments).values(values).returning()
    return row
  }

  async getLatestAmendments(entryIds: string[]) {
    if (!entryIds.length) return new Map<string, typeof partyLedgerAmendments.$inferSelect>()
    const rows = await this.db.select().from(partyLedgerAmendments)
      .where(inArray(partyLedgerAmendments.partyLedgerEventId, entryIds))
      .orderBy(asc(partyLedgerAmendments.partyLedgerEventId), desc(partyLedgerAmendments.createdAt))
    const latest = new Map<string, typeof partyLedgerAmendments.$inferSelect>()
    for (const row of rows) {
      if (!latest.has(row.partyLedgerEventId)) latest.set(row.partyLedgerEventId, row)
    }
    return latest
  }
}
