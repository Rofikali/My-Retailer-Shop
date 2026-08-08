import { requireUser } from '../../utils/auth-guard'
import { customersService } from '../../services/customers.service'
import { CustomerInput } from '../../utils/validation/customer'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const body = await readBody(event)
  const parsed = CustomerInput.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }
  const row = await customersService.create(parsed.data)
  setResponseStatus(event, 201)
  return row
})
