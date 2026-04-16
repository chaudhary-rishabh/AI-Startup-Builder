import { Hono } from 'hono'

import { ok, err } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { getMyUsage } from '../services/userActivity.service.js'

const routes = new Hono()
routes.use('*', requireAuth)

async function rateLimitOk(userId: string): Promise<boolean> {
  const redis = getRedis()
  const key = `analytics:rl:my-usage:${userId}`
  const n = await redis.incr(key)
  if (n === 1) await redis.expire(key, 60)
  return n <= 60
}

routes.get('/me/usage', async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId))) return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  const usage = await getMyUsage(userId)
  return ok(c, usage)
})

export default routes
