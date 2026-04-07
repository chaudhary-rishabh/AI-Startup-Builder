import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

/**
 * Creates a Drizzle ORM client backed by a node-postgres connection pool.
 * Call once per service at startup — share the returned instance via DI or module singleton.
 */
export function createDrizzleClient(databaseUrl: string) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 20,                        // max pool size per service instance
    idleTimeoutMillis: 30_000,      // close idle connections after 30s
    connectionTimeoutMillis: 2_000, // fail fast if DB is unreachable
  })

  pool.on('error', (err: Error) => {
    // Non-fatal pool error — log and let health check handle persistent failures
    console.error('[db] Unexpected pool client error', err)
  })

  return drizzle(pool, {
    logger: process.env['LOG_LEVEL'] === 'debug',
  })
}

export type DrizzleClient = ReturnType<typeof createDrizzleClient>
