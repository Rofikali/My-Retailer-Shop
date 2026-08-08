import { requireUser, requireRole } from '../../../../utils/auth-guard'
import { usersService } from '../../../../services/users.service'
import { z } from 'zod'

const Input = z.object({ isActive: z.boolean() })

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  requireRole(user, ['owner'])

  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const parsed = Input.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input' })
  }

  return usersService.setActive(id, parsed.data.isActive)
})
