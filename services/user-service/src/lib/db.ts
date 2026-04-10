import { createDrizzleClient, type DrizzleClient } from '@repo/db'

import { env } from '../config/env.js'

let _db: DrizzleClient | null = null
let _readDb: DrizzleClient | null = null

export function getDb(): DrizzleClient {
  if (!_db) {
    _db = createDrizzleClient(env.DATABASE_URL)
  }
  return _db
}

export function getReadDb(): DrizzleClient {
  if (!_readDb) {
    const url = env.DATABASE_READ_REPLICA_URL ?? env.DATABASE_URL
    _readDb = createDrizzleClient(url)
  }
  return _readDb
}
