import { Hono } from 'hono'

import { err, ok } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { cancelSubscription, getUserSubscription, reactivateUserSubscription } from '../services/subscription.service.js'

const routes = new Hono()
routes.use('*', requireAuth)

async function rateLimitOk(userId: string, bucket: string, max: number, windowSec: number): Promise<boolean> {
  const redis = getRedis()
  const k = `billing:rl:${bucket}:${userId}`
  const n = await redis.incr(k)
  if (n === 1) await redis.expire(k, windowSec)
  return n <= max
}

routes.get('/subscription', async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId, 'subscription-get', 60, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  }
  const view = await getUserSubscription(userId)
  return ok(c, view)
})

routes.post('/cancel', async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId, 'subscription-cancel', 3, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  }
  const view = await cancelSubscription(userId)
  return ok(c, {
    message: `Subscription will cancel on ${view.currentPeriodEnd?.toLocaleDateString() ?? 'period end'}`,
    accessUntil: view.currentPeriodEnd,
    subscription: view,
  })
})

routes.post('/reactivate', async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId, 'subscription-reactivate', 3, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  }
  const view = await reactivateUserSubscription(userId)
  return ok(c, {
    message: 'Subscription reactivated. You will not be charged early.',
    subscription: view,
  })
})

export default routes
