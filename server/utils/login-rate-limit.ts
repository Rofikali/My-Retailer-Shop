import type { H3Event } from 'h3'

interface RateLimitEntry {
  attempts: number
  resetAt: number
}

const attemptsByKey = new Map<string, RateLimitEntry>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

function keyFor(event: H3Event, email: string): string {
  return `${getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'}:${email.toLowerCase()}`
}

export function assertLoginAllowed(event: H3Event, email: string) {
  const key = keyFor(event, email)
  const entry = attemptsByKey.get(key)
  if (!entry || entry.resetAt <= Date.now()) return

  if (entry.attempts >= MAX_ATTEMPTS) {
    throw createError({ statusCode: 429, statusMessage: 'Too many login attempts. Try again later.' })
  }
}

export function recordFailedLogin(event: H3Event, email: string) {
  const key = keyFor(event, email)
  const now = Date.now()
  const entry = attemptsByKey.get(key)
  if (!entry || entry.resetAt <= now) {
    attemptsByKey.set(key, { attempts: 1, resetAt: now + WINDOW_MS })
    return
  }

  entry.attempts += 1
}

export function clearLoginAttempts(event: H3Event, email: string) {
  attemptsByKey.delete(keyFor(event, email))
}
