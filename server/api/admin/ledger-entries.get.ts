import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { requireUser, requireRole } from '../../utils/auth-guard'
import { db } from '../../db/client'
import { ledgerEntries, accounts, users } from '../../db/schema'

/**
 * This IS the audit trail - every ledger_entries row already carries created_by +
 * created_at (see server/db/schema.ts), so there's no separate audit_log table to
 * maintain (and no separate table to let drift from what actually happened). This
 * endpoint just surfaces that data with the account/user names joined in for display.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  requireRole(user, ['owner', 'accountant_readonly'])

  const query = getQuery(event)
  const today = new Date().toISOString().slice(0, 10)
  const from = typeof query.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.from) ? query.from : `${today.slice(0, 4)}-01-01`
  const to = typeof query.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.to) ? query.to : today
  if (from > to) {
    throw createError({ statusCode: 400, statusMessage: 'From date cannot be after To date.' })
  }
  const requestedLimit = query.limit ? Number(query.limit) : 100
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 500) : 100

  return db
    .select({
      id: ledgerEntries.id,
      entryDate: ledgerEntries.entryDate,
      accountName: accounts.name,
      debit: ledgerEntries.debit,
      credit: ledgerEntries.credit,
      description: ledgerEntries.description,
      referenceId: ledgerEntries.referenceId,
      referenceType: ledgerEntries.referenceType,
      enteredBy: users.name,
      createdAt: ledgerEntries.createdAt,
      isReversal: ledgerEntries.reversesEntryId
    })
    .from(ledgerEntries)
    .innerJoin(accounts, eq(ledgerEntries.accountId, accounts.id))
    .leftJoin(users, eq(ledgerEntries.createdBy, users.id))
    .where(and(gte(ledgerEntries.entryDate, from), lte(ledgerEntries.entryDate, to)))
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(limit)
})
