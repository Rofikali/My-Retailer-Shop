import 'dotenv/config'
import argon2 from 'argon2'
import { eq } from 'drizzle-orm'
import { db } from './client'
import { users } from './schema'

const ownerEmail = process.env.SEED_OWNER_EMAIL
const ownerPassword = process.env.SEED_OWNER_PASSWORD

if (!ownerEmail || !ownerPassword) {
  throw new Error('SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD must be set.')
}

if (ownerPassword.length < 12) {
  throw new Error('SEED_OWNER_PASSWORD must be at least 12 characters long.')
}

async function main() {
  const passwordHash = await argon2.hash(ownerPassword)
  const result = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.email, ownerEmail))
    .returning({ id: users.id })

  if (result.length !== 1) {
    throw new Error(`No user exists for ${ownerEmail}. Run db:seed first or correct SEED_OWNER_EMAIL.`)
  }

  console.log(`Password reset for ${ownerEmail}.`)
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Owner password reset failed:', error)
    process.exit(1)
  })
