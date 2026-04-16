import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

import { ok, err } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { getUserTimeline } from '../services/userActivity.service.js'

const routes = new Hono()
routes.use('*', requireAuth)
routes.use('*', requireAdmin)

const paramSchema = z.object({
  userId: z.string().uuid(),
})

async function rateLimitOk(userId: string): Promise<boolean> {
  const redis = getRedis()
  const key = `analytics:rl:user-timeline:${userId}`
  const n = await redis.incr(key)
  if (n === 1) await redis.expire(key, 60)
  return n <= 30
}

routes.get('/users/:userId', zValidator('param', paramSchema), async (c) => {
  const requesterId = c.get('userId' as never) as string
  if (!(await rateLimitOk(requesterId))) return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  const { userId } = c.req.valid('param')
  const timeline = await getUserTimeline(userId)
  return ok(c, timeline)
})

export default routes
