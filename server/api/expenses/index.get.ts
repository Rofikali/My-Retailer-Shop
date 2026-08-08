import { requireUser } from '../../utils/auth-guard'
import { expensesService } from '../../services/expenses.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const query = getQuery(event)
  return expensesService.list({
    from: query.from as string | undefined,
    to: query.to as string | undefined,
    category: query.category as string | undefined
  })
})
