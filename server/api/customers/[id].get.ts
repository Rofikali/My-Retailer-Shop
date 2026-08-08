import { requireUser } from '../../utils/auth-guard'
import { customersService } from '../../services/customers.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const customer = await customersService.getWithBalance(id)
  if (!customer) throw createError({ statusCode: 404, statusMessage: 'Customer not found' })
  return customer
})
