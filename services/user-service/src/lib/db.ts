import type { DrizzleClient } from '@repo/db'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { env } from '../config/env.js'

let _db: DrizzleClient | null = null
let _readDb: DrizzleClient | null = null
let _writePool: Pool | null = null
let _readPool: Pool | null = null

function openPool(url: string): { pool: Pool; db: DrizzleClient } {
  const pool = new Pool({
    connectionString: url,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
  })
  pool.on('error', (err: Error) => {
    console.error('[db] Unexpected pool client error', err)
  })
  return { pool, db: drizzle(pool) }
}

export function getDb(): DrizzleClient {
  if (!_db) {
    const { pool, db } = openPool(env.DATABASE_URL)
    _writePool = pool
    _db = db
  }
  return _db
}

export function getReadDb(): DrizzleClient {
  if (!_readDb) {
    const url = env.DATABASE_READ_REPLICA_URL ?? env.DATABASE_URL
    const { pool, db } = openPool(url)
    _readPool = pool
    _readDb = db
  }
  return _readDb
}

/** Graceful shutdown for tests (e.g. testcontainers) before stopping Postgres. */
export async function closeDbPools(): Promise<void> {
  await Promise.all([
    _writePool?.end().catch(() => undefined),
    _readPool?.end().catch(() => undefined),
  ])
  _writePool = null
  _readPool = null
  _db = null
  _readDb = null
}
