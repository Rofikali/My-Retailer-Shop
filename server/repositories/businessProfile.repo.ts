import { eq } from 'drizzle-orm'
import type { Database } from '../db/client'
import { businessProfile } from '../db/schema'

/**
 * business_profile is designed as a single-row table for Phase 1 (see
 * docs/03-Database-Schema-ERD.md §1 - "single row for Phase 1, not tenant-scoped").
 * get() returns that one row (or null if seed.ts hasn't run yet); update() always
 * targets it by id rather than assuming row 1 exists, so it fails loudly instead of
 * silently no-op'ing if the table is empty.
 */
export class BusinessProfileRepo {
  constructor(private db: Database) {}

  async get() {
    const [row] = await this.db.select().from(businessProfile).limit(1)
    return row ?? null
  }

  async update(id: string, values: Partial<typeof businessProfile.$inferInsert>) {
    const [row] = await this.db.update(businessProfile).set(values).where(eq(businessProfile.id, id)).returning()
    return row
  }
}
