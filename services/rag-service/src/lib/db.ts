import type { DrizzleClient } from '@repo/db'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { env } from '../config/env.js'

let _pool: Pool | null = null
let _db: DrizzleClient | null = null

export function getDb(): DrizzleClient {
  if (!_db) {
    _pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 2000,
    })
    _pool.on('error', (err: Error) => {
      console.error('[rag-service db] pool error', err)
    })
    _db = drizzle(_pool)
  }
  return _db
}

export async function closeDbPools(): Promise<void> {
  await _pool?.end().catch(() => undefined)
  _pool = null
  _db = null
}

export function setDbForTests(client: DrizzleClient | null, pool: Pool | null): void {
  _db = client
  _pool = pool
}
