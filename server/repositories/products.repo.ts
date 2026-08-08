import { eq, asc, desc, ilike, or } from 'drizzle-orm'
import type { Database } from '../db/client'
import { products } from '../db/schema'

export class ProductsRepo {
  constructor(private db: Database) {}

  async list(search?: string) {
    return this.db
      .select()
      .from(products)
      .where(search ? or(ilike(products.name, `%${search}%`), ilike(products.code, `%${search}%`)) : undefined)
      .orderBy(asc(products.name))
  }

  async getById(id: string) {
    const [row] = await this.db.select().from(products).where(eq(products.id, id))
    return row ?? null
  }

  async insert(values: typeof products.$inferInsert) {
    const [row] = await this.db.insert(products).values(values).returning()
    return row
  }

  async nextCode(): Promise<string> {
    const [row] = await this.db.select().from(products).orderBy(desc(products.createdAt)).limit(1)
    const lastNum = row ? parseInt(row.code.replace(/\D/g, ''), 10) || 0 : 0
    return `PRO-${String(lastNum + 1).padStart(3, '0')}`
  }
}
