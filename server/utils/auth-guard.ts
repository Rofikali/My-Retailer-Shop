import type { H3Event } from 'h3'
import { authService } from '../services/auth.service'
import { getSessionUserId } from './session'

/** Call at the top of any protected API route handler. Throws 401 if not logged in. */
export async function requireUser(event: H3Event) {
  const userId = getSessionUserId(event)
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const user = await authService.getUserById(userId)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  return user
}

/** Call after requireUser() when a route is restricted to specific roles. */
export function requireRole(user: { role: string }, allowed: string[]) {
  if (!allowed.includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'You do not have permission to do this' })
  }
}
