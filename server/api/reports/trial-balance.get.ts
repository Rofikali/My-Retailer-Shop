import { requireUser } from '../../utils/auth-guard'
import { reportService } from '../../services/report.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const query = getQuery(event)
  const asOf = (query.asOf as string) || new Date().toISOString().slice(0, 10)
  return reportService.trialBalance(asOf)
})
