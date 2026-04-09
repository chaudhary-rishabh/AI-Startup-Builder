import { Hono } from 'hono'
import { Redis } from 'ioredis'

import { serviceRegistry } from '../config/serviceRegistry.js'
import { createJwtVerify } from '../middleware/jwtVerify.js'
import { createCircuitBreaker } from '../middleware/circuitBreaker.js'
import { generalRateLimiter } from '../middleware/rateLimiter.js'
import { buildUpstreamUrl, proxyRequest } from '../lib/proxy.js'
import type { AppJWTPayload } from '../types.js'
import { logger } from '../observability/logger.js'
import { env } from '../config/env.js'

const notification = new Hono()
const jwt = createJwtVerify()
const cb = createCircuitBreaker('notification')

let _notifRedis: Redis | null = null
export function setNotificationRedisForTests(r: Redis): void {
  _notifRedis = r
}

function getNotifRedis(): Redis {
  if (!_notifRedis) {
    _notifRedis = new Redis(env.REDIS_URL)
  }
  return _notifRedis
}

function upstream(c: Parameters<typeof buildUpstreamUrl>[0]): string {
  return buildUpstreamUrl(c, serviceRegistry.notification)
}

async function proxy(c: Parameters<typeof proxyRequest>[0]): Promise<Response> {
  return cb.fire(() => proxyRequest(c, upstream(c)))
}

// ── All notification routes require JWT ───────────────────────────────────────
notification.use('/*', jwt)

notification.get('/', generalRateLimiter, async (c) => proxy(c))
notification.patch('/:id/read', generalRateLimiter, async (c) => proxy(c))
notification.post('/read-all', generalRateLimiter, async (c) => proxy(c))
notification.delete('/:id', generalRateLimiter, async (c) => proxy(c))

/**
 * GET /notifications/unread-count
 * Cached at the gateway layer for 5 s per user to reduce notification-service load.
 */
notification.get('/unread-count', generalRateLimiter, async (c) => {
  const user = c.get('user' as never) as AppJWTPayload | undefined
  const cacheKey = `notif:unread:${user?.sub ?? 'anon'}`

  try {
    const redis = getNotifRedis()
    const cached = await redis.get(cacheKey)
    if (cached) {
      return c.json(JSON.parse(cached) as Record<string, unknown>)
    }

    const response = await cb.fire(() => proxyRequest(c, upstream(c)))

    if (response.status === 200) {
      const cloned = response.clone()
      const body = await cloned.json() as Record<string, unknown>
      await redis.set(cacheKey, JSON.stringify(body), 'EX', 5)
    }

    return response
  } catch (err) {
    logger.warn({
      event: 'notification_cache_error',
      message: err instanceof Error ? err.message : 'unknown',
    })
    return proxy(c)
  }
})

notification.patch('/preferences', generalRateLimiter, async (c) => proxy(c))
notification.get('/preferences', generalRateLimiter, async (c) => proxy(c))
notification.get('/email-logs', generalRateLimiter, async (c) => proxy(c))

export { notification as notificationRoutes }
