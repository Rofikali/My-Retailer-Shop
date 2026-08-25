import { and, asc, count, eq } from 'drizzle-orm'
import type { Database } from '../db/client'
import { users } from '../db/schema'

export class UsersRepo {
  constructor(private db: Database) {}

  async list() {
    return this.db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive, createdAt: users.createdAt })
      .from(users)
      .orderBy(asc(users.createdAt))
  }

  async findByEmail(email: string) {
    const [row] = await this.db.select().from(users).where(eq(users.email, email))
    return row ?? null
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(users).where(eq(users.id, id))
    return row ?? null
  }

  async countActiveOwners() {
    const [row] = await this.db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.role, 'owner'), eq(users.isActive, true)))
    return Number(row?.value ?? 0)
  }

  async insert(values: typeof users.$inferInsert) {
    const [row] = await this.db.insert(users).values(values).returning({
      id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive
    })
    return row
  }

  async setActive(id: string, isActive: boolean) {
    const [row] = await this.db.update(users).set({ isActive }).where(eq(users.id, id)).returning({
      id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive
    })
    return row
  }

  async update(id: string, values: Partial<typeof users.$inferInsert>) {
    const [row] = await this.db.update(users).set(values).where(eq(users.id, id)).returning({
      id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive
    })
    return row ?? null
  }
}
