import { and, asc, eq, gte, lt, lte, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { accounts, ledgerEntries, users } from '../db/schema'
import { requireUser } from '../utils/auth-guard'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const query = getQuery(event)
  const accountCode = typeof query.accountCode === 'string' ? query.accountCode : undefined
  const from = typeof query.from === 'string' ? query.from : undefined
  const to = typeof query.to === 'string' ? query.to : undefined
  if (!accountCode) throw createError({ statusCode: 400, statusMessage: 'Account is required' })

  const [opening] = await db.select({ balance: sql<string>`COALESCE(SUM(${ledgerEntries.debit}) - SUM(${ledgerEntries.credit}), 0)` })
    .from(ledgerEntries).innerJoin(accounts, eq(ledgerEntries.accountId, accounts.id))
    .where(and(eq(accounts.code, accountCode), from ? lt(ledgerEntries.entryDate, from) : undefined))
  const conditions = [eq(accounts.code, accountCode)]
  if (from) conditions.push(gte(ledgerEntries.entryDate, from))
  if (to) conditions.push(lte(ledgerEntries.entryDate, to))
  const entries = await db.select({ id:ledgerEntries.id, entryDate:ledgerEntries.entryDate, accountHead:accounts.name, accountCode:accounts.code, voucherNo:ledgerEntries.referenceId, journalNo:ledgerEntries.referenceType, particulars:ledgerEntries.description, debit:ledgerEntries.debit, credit:ledgerEntries.credit, reference:ledgerEntries.referenceId, status:ledgerEntries.referenceType, enteredBy:users.name, remarks:ledgerEntries.description })
    .from(ledgerEntries).innerJoin(accounts, eq(ledgerEntries.accountId, accounts.id)).leftJoin(users, eq(ledgerEntries.createdBy, users.id))
    .where(and(...conditions)).orderBy(asc(ledgerEntries.entryDate), asc(ledgerEntries.createdAt)).limit(500)
  return { openingBalance:Number(opening?.balance || 0), entries }
})
