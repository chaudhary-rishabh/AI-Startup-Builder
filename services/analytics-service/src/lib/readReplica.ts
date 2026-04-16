import type { DrizzleClient } from '@repo/db'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { env } from '../config/env.js'

const replicaUrl = env.DATABASE_READ_REPLICA_URL ?? env.DATABASE_URL

let _replicaPool: Pool | null = null
let _readReplica: DrizzleClient | null = null

export function getReadReplica(): DrizzleClient {
  if (!_readReplica) {
    _replicaPool = new Pool({
      connectionString: replicaUrl,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
    _replicaPool.on('error', (error: Error) => {
      console.error('[analytics-service read-replica] pool error', error)
    })
    _readReplica = drizzle(_replicaPool)
  }
  return _readReplica
}

export async function closeReadReplicaPools(): Promise<void> {
  await _replicaPool?.end().catch(() => undefined)
  _replicaPool = null
  _readReplica = null
}
