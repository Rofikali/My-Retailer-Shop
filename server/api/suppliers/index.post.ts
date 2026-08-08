import { requireUser } from '../../utils/auth-guard'
import { suppliersService } from '../../services/suppliers.service'
import { SupplierInput } from '../../utils/validation/supplier'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const body = await readBody(event)
  const parsed = SupplierInput.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }
  const row = await suppliersService.create(parsed.data)
  setResponseStatus(event, 201)
  return row
})
