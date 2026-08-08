import { requireUser } from '../../utils/auth-guard'
import { purchasesService } from '../../services/purchases.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  return purchasesService.list()
})
