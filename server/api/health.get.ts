import { sql } from 'drizzle-orm'
import { db } from '../db/client'

export default defineEventHandler(async () => {
  try {
    await db.execute(sql`SELECT 1`)
    return { status: 'ok', timestamp: new Date().toISOString() }
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Database unavailable' })
  }
})
