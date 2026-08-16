import { requireUser } from '../../utils/auth-guard'
import { reportService } from '../../services/report.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  return reportService.dataQualityReview()
})
