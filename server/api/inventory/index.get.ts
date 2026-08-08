import { requireUser } from '../../utils/auth-guard'
import { inventoryService } from '../../services/inventory.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  return inventoryService.listWithStock()
})
