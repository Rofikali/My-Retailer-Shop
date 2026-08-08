import { requireUser } from '../../utils/auth-guard'
import { salesService } from '../../services/sales.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  return salesService.list()
})
