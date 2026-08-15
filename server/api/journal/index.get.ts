import { and, desc, eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { accounts, ledgerEntries, users } from '../../db/schema'
import { requireUser } from '../../utils/auth-guard'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  return db.select({ id: ledgerEntries.id, entryDate: ledgerEntries.entryDate, accountHead: accounts.name, accountCode: accounts.code, debit: ledgerEntries.debit, credit: ledgerEntries.credit, particulars: ledgerEntries.description, reference: ledgerEntries.referenceId, posted: ledgerEntries.referenceType, enteredBy: users.name, approvedBy: users.name, remarks: ledgerEntries.description, createdAt: ledgerEntries.createdAt })
    .from(ledgerEntries).innerJoin(accounts, eq(ledgerEntries.accountId, accounts.id)).leftJoin(users, eq(ledgerEntries.createdBy, users.id))
    .where(and(eq(ledgerEntries.referenceType, 'journal'))).orderBy(desc(ledgerEntries.createdAt)).limit(200)
})
