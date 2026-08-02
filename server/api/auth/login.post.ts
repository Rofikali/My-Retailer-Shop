import { z } from 'zod'
import { authService } from '../../services/auth.service'
import { setSessionCookie } from '../../utils/session'

const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = LoginInput.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  const user = await authService.verifyCredentials(parsed.data.email, parsed.data.password)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  setSessionCookie(event, user.id)
  return { user }
})
