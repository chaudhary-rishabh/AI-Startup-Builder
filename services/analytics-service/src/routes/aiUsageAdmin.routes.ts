import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { ok, err } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { getAIUsageOverview } from '../services/aiUsageOverview.service.js'

const routes = new Hono()
routes.use('*', requireAuth)
routes.use('*', requireAdmin)

const overviewQuery = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

async function rateLimitOk(userId: string): Promise<boolean> {
  const redis = getRedis()
  const key = `analytics:rl:ai-usage-overview:${userId}`
  const n = await redis.incr(key)
  if (n === 1) await redis.expire(key, 60)
  return n <= 30
}

routes.get('/overview', zValidator('query', overviewQuery), async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId))) return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  const q = c.req.valid('query')
  const fromIso = `${q.from}T00:00:00.000Z`
  const toIso = `${q.to}T23:59:59.999Z`
  const data = await getAIUsageOverview(fromIso, toIso)
  return ok(c, data)
})

export default routes
