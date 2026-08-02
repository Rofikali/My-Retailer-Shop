import { clearSessionCookie } from '../../utils/session'

export default defineEventHandler(async (event) => {
  clearSessionCookie(event)
  return { ok: true }
})
