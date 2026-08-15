import { db } from '../../db/client'
import { requireRole, requireUser } from '../../utils/auth-guard'
import { LedgerService } from '../../services/ledger.service'
import { PartyLedgerService } from '../../services/party-ledger.service'
import { LedgerReversalInput } from '../../utils/validation/ledgerReversal'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  requireRole(user, ['owner'])
  const parsed = LedgerReversalInput.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid reversal request', data: parsed.error.flatten() })

  const result = await db.transaction(async (tx) => {
    const dbTx = tx as unknown as typeof db
    const ledger = new LedgerService(db)
    const reversed = await ledger.reverse(dbTx, parsed.data.referenceId, {
      entryDate: parsed.data.reversalDate,
      description: `Reversal: ${parsed.data.reason}`,
      createdBy: user.id
    })
    await new PartyLedgerService(db).reverseOpeningBalance(dbTx, parsed.data.referenceId, parsed.data.reversalDate, parsed.data.reason, user.id)
    return reversed
  })
  setResponseStatus(event, 201)
  return result
})
