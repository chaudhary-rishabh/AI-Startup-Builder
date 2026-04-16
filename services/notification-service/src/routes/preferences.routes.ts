import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { findOrCreatePrefs, updatePrefs } from '../db/queries/notificationPrefs.queries.js'
import { env } from '../config/env.js'
import { err, ok } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { requireAuth } from '../middleware/requireAuth.js'

const routes = new Hono()
routes.use('*', requireAuth)

async function rateLimitOk(userId: string, bucket: string, max: number, windowSec: number): Promise<boolean> {
  const redis = getRedis()
  const key = `notif:rl:prefs:${bucket}:${userId}`
  const n = await redis.incr(key)
  if (n === 1) await redis.expire(key, windowSec)
  return n <= max
}

routes.get('/preferences', async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId, 'get', 60, 60))) return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  const cacheKey = `notif:prefs:${userId}`
  const redis = getRedis()
  const cached = await redis.get(cacheKey)
  if (cached) return ok(c, JSON.parse(cached) as unknown)

  const prefs = await findOrCreatePrefs(userId)
  const response = {
    ...prefs,
    securityAlerts: true,
    securityAlertsLocked: true,
  }
  await redis.setex(cacheKey, env.PREFS_CACHE_TTL, JSON.stringify(response))
  return ok(c, response)
})

const prefsPatchSchema = z.object({
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  phaseComplete: z.boolean().optional(),
  agentDone: z.boolean().optional(),
  billingEvents: z.boolean().optional(),
  tokenWarnings: z.boolean().optional(),
  ragStatus: z.boolean().optional(),
  exportReady: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
})

routes.patch('/preferences', zValidator('json', prefsPatchSchema), async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId, 'patch', 10, 60))) return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  const body = c.req.valid('json') as Record<string, unknown>
  delete body['securityAlerts']

  const updated = await updatePrefs(userId, body)
  await getRedis().del(`notif:prefs:${userId}`)
  return ok(c, {
    ...updated,
    securityAlerts: true,
    securityAlertsLocked: true,
  })
})

export default routes
