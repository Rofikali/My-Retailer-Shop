import 'dotenv/config'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.TEST_DATABASE_URL

if (!connectionString) {
  throw new Error('TEST_DATABASE_URL is not set. Copy .env.example to .env and fill it in.')
}

async function main() {
  const client = postgres(connectionString, { max: 1 })
  const database = drizzle(client)

  try {
    console.log('Running test database migrations...')
    await migrate(database, { migrationsFolder: './server/db/migrations' })
    console.log('Test database migrations complete.')
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error('Test database migration failed:', error)
  process.exitCode = 1
})
