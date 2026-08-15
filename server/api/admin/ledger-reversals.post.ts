import { db } from '../../db/client'
import { requireRole, requireUser } from '../../utils/auth-guard'
import { LedgerService } from '../../services/ledger.service'
import { LedgerReversalInput } from '../../utils/validation/ledgerReversal'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  requireRole(user, ['owner'])
  const parsed = LedgerReversalInput.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid reversal request', data: parsed.error.flatten() })

  const result = await db.transaction(async (tx) => new LedgerService(db).reverse(tx as unknown as typeof db, parsed.data.referenceId, {
    entryDate: parsed.data.reversalDate,
    description: `Reversal: ${parsed.data.reason}`,
    createdBy: user.id
  }))
  setResponseStatus(event, 201)
  return result
})
