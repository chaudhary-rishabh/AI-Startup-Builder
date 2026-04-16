import { Redis } from 'ioredis'

import { env } from '../config/env.js'

let _redis: Redis | undefined

export function setRedisForTests(client: Redis | undefined): void {
  _redis = client
}

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    })
    _redis.on('error', (error: Error) => {
      console.error('[analytics-service] Redis error:', error.message)
    })
  }
  return _redis
}
