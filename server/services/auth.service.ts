import { eq } from 'drizzle-orm'
import argon2 from 'argon2'
import { db } from '../db/client'
import { users } from '../db/schema'

/**
 * Minimal session-based auth for Phase 1 (single business, few users).
 * For production, swap this for Better Auth or Lucia (see HLD) - this hand-rolled
 * version exists to keep the scaffold dependency-light and easy to read; it is NOT
 * a recommendation to keep hand-rolling auth long-term. Replace before adding
 * anything beyond a handful of trusted users.
 */
export class AuthService {
  async verifyCredentials(email: string, password: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email))
    if (!user || !user.isActive) return null

    const valid = await argon2.verify(user.passwordHash, password)
    if (!valid) return null

    return { id: user.id, name: user.name, email: user.email, role: user.role }
  }

  async getUserById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id))
    if (!user) return null
    return { id: user.id, name: user.name, email: user.email, role: user.role }
  }
}

export const authService = new AuthService()
