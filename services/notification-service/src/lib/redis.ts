import { Redis } from 'ioredis'

import { env } from '../config/env.js'

let _redis: Redis | undefined

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
    _redis.on('error', (error: Error) => {
      console.error('[notification-service redis] error', error)
    })
  }
  return _redis
}

export async function closeRedis(): Promise<void> {
  if (!_redis) return
  await _redis.quit().catch(() => undefined)
  _redis = undefined
}

export function setRedisForTests(client?: Redis): void {
  _redis = client
}
