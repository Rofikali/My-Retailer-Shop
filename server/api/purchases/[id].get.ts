import { requireUser } from '../../utils/auth-guard'
import { purchasesService } from '../../services/purchases.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const purchase = await purchasesService.getById(id)
  if (!purchase) throw createError({ statusCode: 404, statusMessage: 'Purchase not found' })
  return purchase
})
