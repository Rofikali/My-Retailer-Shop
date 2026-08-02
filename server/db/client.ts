import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Single shared connection pool for the whole app.
// useRuntimeConfig() only works inside a Nuxt/Nitro request context, so for
// scripts (migrate/seed) fall back to process.env directly.
const connectionString = process.env.DATABASE_URL as string

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.')
}

const client = postgres(connectionString, { max: 10 })

export const db = drizzle(client, { schema })
export type Database = typeof db
