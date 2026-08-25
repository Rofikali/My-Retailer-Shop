import { requireRole, requireUser } from '../../../utils/auth-guard'
import { usersService } from '../../../services/users.service'
import { UpdateUserInput } from '../../../utils/validation/user'

export default defineEventHandler(async (event) => {
  const actor = await requireUser(event)
  requireRole(actor, ['owner'])

  const id = getRouterParam(event, 'id')!
  const parsed = UpdateUserInput.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid account update', data: parsed.error.flatten() })
  }

  return usersService.update(id, parsed.data, actor.id)
})
