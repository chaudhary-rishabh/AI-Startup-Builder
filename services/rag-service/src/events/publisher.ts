import { getRedis } from '../lib/redis.js'

const STREAM_KEY = 'platform:events'

export async function publishDocumentIndexed(payload: {
  userId: string
  docId: string
  chunkCount: number
  namespace: string
}): Promise<void> {
  const redis = getRedis()
  await redis.xadd(
    STREAM_KEY,
    'MAXLEN',
    '~',
    '100000',
    '*',
    'type',
    'document.indexed',
    'payload',
    JSON.stringify(payload),
    'timestamp',
    new Date().toISOString(),
    'source',
    'rag-service',
    'version',
    '1',
  )
}

export async function publishDocumentIndexingFailed(payload: {
  userId: string
  docId: string
  error: string
}): Promise<void> {
  const redis = getRedis()
  await redis.xadd(
    STREAM_KEY,
    'MAXLEN',
    '~',
    '100000',
    '*',
    'type',
    'document.indexing.failed',
    'payload',
    JSON.stringify(payload),
    'timestamp',
    new Date().toISOString(),
    'source',
    'rag-service',
    'version',
    '1',
  )
}
