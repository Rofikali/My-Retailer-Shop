import { requireUser } from '../../utils/auth-guard'
import { salesService } from '../../services/sales.service'
import { SaleInput } from '../../utils/validation/sale'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)
  const parsed = SaleInput.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  const sale = await salesService.recordSale(parsed.data, user.id)
  setResponseStatus(event, 201)
  return sale
})
