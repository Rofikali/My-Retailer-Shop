import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set.')
}

const client = postgres(connectionString, { max: 1 })

try {
  console.log('Running production migrations...')
  await migrate(drizzle(client), { migrationsFolder: './server/db/migrations' })
  console.log('Production migrations complete.')
} finally {
  await client.end()
}
