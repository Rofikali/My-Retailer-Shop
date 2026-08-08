import { requireUser } from '../../utils/auth-guard'
import { salesService } from '../../services/sales.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const sale = await salesService.getById(id)
  if (!sale) throw createError({ statusCode: 404, statusMessage: 'Sale not found' })
  return sale
})
