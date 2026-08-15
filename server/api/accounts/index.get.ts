import { asc } from 'drizzle-orm'
import { db } from '../../db/client'
import { accounts } from '../../db/schema'
import { requireUser } from '../../utils/auth-guard'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  return db.select({ code: accounts.code, name: accounts.name, type: accounts.type }).from(accounts).orderBy(asc(accounts.type), asc(accounts.name))
})
