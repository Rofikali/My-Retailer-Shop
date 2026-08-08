import { requireUser } from '../../utils/auth-guard'
import { productsService } from '../../services/products.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const query = getQuery(event)
  return productsService.list(query.search as string | undefined)
})
