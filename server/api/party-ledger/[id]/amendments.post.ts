import { db } from '../../../db/client'
import { requireRole, requireUser } from '../../../utils/auth-guard'
import { PartyLedgerService } from '../../../services/party-ledger.service'
import { PartyLedgerAmendmentInput } from '../../../utils/validation/partyLedgerAmendment'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  requireRole(user, ['owner'])
  const id = getRouterParam(event, 'id')!
  const parsed = PartyLedgerAmendmentInput.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid ledger amendment', data: parsed.error.flatten() })
  }

  const amendment = await db.transaction((tx) =>
    new PartyLedgerService(tx as unknown as typeof db).amendMetadata(tx as unknown as typeof db, id, parsed.data, user.id)
  )
  setResponseStatus(event, 201)
  return amendment
})
