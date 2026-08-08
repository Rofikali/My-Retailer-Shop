import { requireUser, requireRole } from '../../../utils/auth-guard'
import { usersService } from '../../../services/users.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  requireRole(user, ['owner'])
  return usersService.list()
})
