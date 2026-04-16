import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { env } from '../config/env.js'
import { ok } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateCoupon } from '../services/coupon.service.js'

const routes = new Hono()
routes.use('*', requireAuth)

const schema = z.object({
  code: z.string().trim().min(1).max(50),
  plan: z.enum(['pro', 'team']).optional(),
})

async function rateLimitOk(userId: string, bucket: string, max: number, windowSec: number): Promise<boolean> {
  const redis = getRedis()
  const k = `billing:rl:${bucket}:${userId}`
  const n = await redis.incr(k)
  if (n === 1) await redis.expire(k, windowSec)
  return n <= max
}

routes.post('/coupons/validate', zValidator('json', schema), async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId, 'coupon-validate', 10, 60))) {
    return c.json(
      { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
      429,
    )
  }
  const body = c.req.valid('json')
  const code = body.code.toUpperCase().trim()
  const cacheKey = `billing:coupon:${code}`
  const redis = getRedis()
  const cached = await redis.get(cacheKey)
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { valid: true }
      return ok(c, parsed)
    } catch {
      // continue
    }
  }

  const result = await validateCoupon(code, body.plan)
  if (result.valid) {
    await redis.setex(cacheKey, 60, JSON.stringify(result))
  }
  await redis.del(`billing:subscription:${userId}`)
  await redis.expire(cacheKey, Math.min(60, env.SUBSCRIPTION_CACHE_TTL))
  return ok(c, result)
})

export default routes
