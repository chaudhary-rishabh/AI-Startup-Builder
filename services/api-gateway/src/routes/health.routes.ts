import { Hono } from 'hono'
import { Redis } from 'ioredis'

import { env } from '../config/env.js'

let _testRedis: Redis | null = null

/** Inject a Redis instance for tests */
export function setHealthRedisForTests(r: Redis): void {
  _testRedis = r
}

export interface LivenessPayload {
  status: 'ok'
  service: 'api-gateway'
  timestamp: string
}

/** Shared JSON for liveness probes (also used by GET / on the main app). */
export function buildLivenessPayload(): LivenessPayload {
  return {
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  }
}

async function checkRedis(): Promise<'ok' | 'failed'> {
  try {
    if (_testRedis) {
      await _testRedis.ping()
      return 'ok'
    }

    const redis = new Redis(env.REDIS_URL, { lazyConnect: true, connectTimeout: 3000 })
    await redis.connect()
    await redis.ping()
    await redis.quit()
    return 'ok'
  } catch {
    return 'failed'
  }
}

const health = new Hono()

/**
 * GET /health — liveness (process is up). Same semantics as GET /health/live.
 */
health.get('/', (c) => c.json(buildLivenessPayload()))

/**
 * GET /health/live — explicit liveness for Kubernetes-style probes (alias of GET /health).
 */
health.get('/live', (c) => c.json(buildLivenessPayload()))

/**
 * GET /health/ready — readiness: verifies Redis (rate limits / shared infra).
 * Returns 503 if Redis is unavailable.
 */
health.get('/ready', async (c) => {
  const redisStatus = await checkRedis()
  const allHealthy = redisStatus === 'ok'

  return c.json(
    {
      status: allHealthy ? 'ok' : 'error',
      service: 'api-gateway',
      checks: { redis: redisStatus },
      timestamp: new Date().toISOString(),
    },
    allHealthy ? 200 : 503,
  )
})

export { health as healthRoutes }
