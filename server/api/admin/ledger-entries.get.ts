import { desc, eq } from 'drizzle-orm'
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
  const limit = query.limit ? Number(query.limit) : 100

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
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(limit)
})
