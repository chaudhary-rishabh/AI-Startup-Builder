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
    _redis.on('error', (err: Error) => {
      console.error('[auth-service] Redis connection error:', err.message)
    })
  }
  return _redis
}

export function bruteForceKey(ip: string): string {
  return `auth:brute:${ip}`
}

export function refreshTokenKey(tokenHash: string): string {
  return `auth:rt:${tokenHash}`
}

export function sessionKey(userId: string): string {
  return `auth:session:${userId}`
}

export function emailVerifyKey(token: string): string {
  return `auth:verify:${token}`
}
