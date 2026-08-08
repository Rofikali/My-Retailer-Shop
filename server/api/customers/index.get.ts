import { requireUser } from '../../utils/auth-guard'
import { customersService } from '../../services/customers.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const query = getQuery(event)
  return customersService.list(query.search as string | undefined)
})
