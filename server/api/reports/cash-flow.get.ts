import { requireUser } from '../../utils/auth-guard'
import { reportService } from '../../services/report.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const query = getQuery(event)
  const to = (query.to as string) || new Date().toISOString().slice(0, 10)
  const from = (query.from as string) || `${to.slice(0, 4)}-01-01`
  return reportService.cashFlow(from, to)
})
