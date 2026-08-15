import { requireUser } from '../../utils/auth-guard'
import { customersService } from '../../services/customers.service'
import { CustomerUpdateInput } from '../../utils/validation/customer'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const parsed = CustomerUpdateInput.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid customer update', data: parsed.error.flatten() })
  const customer = await customersService.update(getRouterParam(event, 'id')!, parsed.data)
  if (!customer) throw createError({ statusCode: 404, statusMessage: 'Customer not found' })
  return customer
})
