import { requireUser } from '../../utils/auth-guard'
import { purchasesService } from '../../services/purchases.service'
import { PurchaseInput } from '../../utils/validation/purchase'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)
  const parsed = PurchaseInput.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  const purchase = await purchasesService.recordPurchase(parsed.data, user.id)
  setResponseStatus(event, 201)
  return purchase
})
