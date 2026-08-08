import { requireUser } from '../../utils/auth-guard'
import { suppliersService } from '../../services/suppliers.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const supplier = await suppliersService.getWithBalance(id)
  if (!supplier) throw createError({ statusCode: 404, statusMessage: 'Supplier not found' })
  return supplier
})
