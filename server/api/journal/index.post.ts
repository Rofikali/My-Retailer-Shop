import { randomUUID } from 'node:crypto'
import { db } from '../../db/client'
import { requireRole, requireUser } from '../../utils/auth-guard'
import { LedgerService } from '../../services/ledger.service'
import { JournalInput } from '../../utils/validation/journal'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  requireRole(user, ['owner', 'staff'])
  const parsed = JournalInput.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid journal entry', data: parsed.error.flatten() })
  const input = parsed.data
  const referenceId = randomUUID()
  const journalNo = `JNL-${referenceId.slice(0, 8).toUpperCase()}`
  const voucherNo = input.voucherNo || journalNo
  await db.transaction(async (tx) => {
    await new LedgerService(db).post(tx as unknown as typeof db, [
      { accountCode: input.debitAccountCode, debit: input.amount },
      { accountCode: input.creditAccountCode, credit: input.amount }
    ], { entryDate: input.entryDate, description: input.particulars, referenceType: 'journal', referenceId, createdBy: user.id })
  })
  setResponseStatus(event, 201)
  return { journalNo, voucherNo, referenceId, posted: true }
})
