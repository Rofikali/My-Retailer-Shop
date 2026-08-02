import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const COOKIE_NAME = 'session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

function sign(value: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(value).digest('hex')
  return `${value}.${sig}`
}

function verify(signed: string, secret: string): string | null {
  const idx = signed.lastIndexOf('.')
  if (idx === -1) return null
  const value = signed.slice(0, idx)
  const sig = signed.slice(idx + 1)
  const expected = createHmac('sha256', secret).update(value).digest('hex')

  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return value
}

export function setSessionCookie(event: H3Event, userId: string) {
  const secret = useRuntimeConfig().sessionSecret as string
  const token = sign(userId, secret)
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
    path: '/'
  })
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export function getSessionUserId(event: H3Event): string | null {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null
  const secret = useRuntimeConfig().sessionSecret as string
  return verify(token, secret)
}
