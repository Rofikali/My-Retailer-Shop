import { z } from 'zod'
import { authService } from '../../services/auth.service'
import { setSessionCookie } from '../../utils/session'
import { assertLoginAllowed, clearLoginAttempts, recordFailedLogin } from '../../utils/login-rate-limit'

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

  assertLoginAllowed(event, parsed.data.email)
  const user = await authService.verifyCredentials(parsed.data.email, parsed.data.password)
  if (!user) {
    recordFailedLogin(event, parsed.data.email)
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  clearLoginAttempts(event, parsed.data.email)
  setSessionCookie(event, user.id)
  return { user }
})
