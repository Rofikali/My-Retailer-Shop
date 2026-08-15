import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '../db/client'
import { partyLedgerEvents } from '../db/schema'

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
}
