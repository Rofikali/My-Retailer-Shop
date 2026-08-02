import { requireUser } from '../../utils/auth-guard'
import { cashBookService } from '../../services/cashbook.service'
import { CashTxnInput } from '../../utils/validation/cashTxn'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)
  const parsed = CashTxnInput.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  const row = await cashBookService.record(parsed.data, user.id)
  setResponseStatus(event, 201)
  return row
})
