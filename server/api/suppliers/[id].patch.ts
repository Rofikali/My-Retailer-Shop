import { requireUser } from '../../utils/auth-guard'
import { suppliersService } from '../../services/suppliers.service'
import { SupplierUpdateInput } from '../../utils/validation/supplier'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const parsed = SupplierUpdateInput.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid supplier update', data: parsed.error.flatten() })
  const supplier = await suppliersService.update(getRouterParam(event, 'id')!, parsed.data)
  if (!supplier) throw createError({ statusCode: 404, statusMessage: 'Supplier not found' })
  return supplier
})
