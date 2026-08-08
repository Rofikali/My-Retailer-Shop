import { requireUser, requireRole } from '../../../utils/auth-guard'
import { businessProfileService } from '../../../services/businessProfile.service'
import { BusinessProfileInput } from '../../../utils/validation/businessProfile'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  requireRole(user, ['owner'])

  const body = await readBody(event)
  const parsed = BusinessProfileInput.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  return businessProfileService.update(parsed.data)
})
