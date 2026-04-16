import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { validateDateRange } from '../lib/dateRange.js'
import { ok, err } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { getFunnel } from '../services/funnelAnalyzer.service.js'

const routes = new Hono()
routes.use('*', requireAuth)
routes.use('*', requireAdmin)

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

async function rateLimitOk(userId: string): Promise<boolean> {
  const redis = getRedis()
  const key = `analytics:rl:funnel:${userId}`
  const n = await redis.incr(key)
  if (n === 1) await redis.expire(key, 60)
  return n <= 30
}

routes.get('/funnel', zValidator('query', querySchema), async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId))) return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  const query = c.req.valid('query')
  const range = validateDateRange(query.from, query.to)
  return ok(c, await getFunnel(range))
})

export default routes
