import { requireUser } from '../../../utils/auth-guard'
import { businessProfileService } from '../../../services/businessProfile.service'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const profile = await businessProfileService.get()
  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: 'No business profile found - run pnpm run db:seed' })
  }
  return profile
})
