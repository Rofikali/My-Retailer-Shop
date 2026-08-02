import { authService } from '../../services/auth.service'
import { getSessionUserId } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const userId = getSessionUserId(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }
  const user = await authService.getUserById(userId)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }
  return { user }
})
