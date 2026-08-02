import { requireUser } from '../../utils/auth-guard'
import { cashBookService } from '../../services/cashbook.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const query = getQuery(event)

  return cashBookService.list({
    from: query.from as string | undefined,
    to: query.to as string | undefined,
    category: query.category as string | undefined,
    page: query.page ? Number(query.page) : 1,
    pageSize: query.pageSize ? Number(query.pageSize) : 50
  })
})
