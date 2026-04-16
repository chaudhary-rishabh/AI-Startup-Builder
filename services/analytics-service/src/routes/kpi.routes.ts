import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { validateDateRange } from '../lib/dateRange.js'
import { ok, err } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { getKpis } from '../services/kpiAggregator.service.js'

const routes = new Hono()
routes.use('*', requireAuth)
routes.use('*', requireAdmin)

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  granularity: z.enum(['day', 'week', 'month']).default('day'),
})

async function rateLimitOk(userId: string): Promise<boolean> {
  const redis = getRedis()
  const key = `analytics:rl:kpis:${userId}`
  const n = await redis.incr(key)
  if (n === 1) await redis.expire(key, 60)
  return n <= 30
}

routes.get('/kpis', zValidator('query', querySchema), async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId))) return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  const query = c.req.valid('query')
  const range = validateDateRange(query.from, query.to, query.granularity)
  const result = await getKpis(range)
  return ok(c, result)
})

export default routes
