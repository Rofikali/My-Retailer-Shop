import postgres from 'postgres'

export default defineEventHandler(async () => {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Database configuration unavailable'
    })
  }

  const client = postgres(connectionString, { connect_timeout: 5, max: 1 })

  try {
    await client`SELECT 1`
    return { status: 'ok', timestamp: new Date().toISOString() }
  } catch (error) {
    console.error(JSON.stringify({
      event: 'database_health_check_failed',
      message: error instanceof Error ? error.message : 'Unknown database error'
    }))
    throw createError({ statusCode: 503, statusMessage: 'Database unavailable' })
  } finally {
    await client.end()
  }
})
