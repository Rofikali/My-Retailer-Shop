import { requireUser, requireRole } from '../../../utils/auth-guard'
import { usersService } from '../../../services/users.service'
import { CreateUserInput } from '../../../utils/validation/user'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  requireRole(user, ['owner'])

  const body = await readBody(event)
  const parsed = CreateUserInput.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  const row = await usersService.create(parsed.data)
  setResponseStatus(event, 201)
  return row
})
