import { requireUser } from '../../utils/auth-guard'
import { suppliersService } from '../../services/suppliers.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const query = getQuery(event)
  return suppliersService.list(query.search as string | undefined)
})
