import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { env } from '../config/env.js'
import { err, ok } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateCoupon } from '../services/coupon.service.js'
import { initiateCheckout } from '../services/subscription.service.js'
import { RazorpayCheckoutSchema } from '../validators/billing.validators.js'

const routes = new Hono()
routes.use('*', requireAuth)

const portalSchema = z.object({
  returnUrl: z.string().url().optional(),
})

async function rateLimitOk(userId: string, bucket: string, max: number, windowSec: number): Promise<boolean> {
  const redis = getRedis()
  const k = `billing:rl:${bucket}:${userId}`
  const n = await redis.incr(k)
  if (n === 1) await redis.expire(k, windowSec)
  return n <= max
}

routes.post('/checkout', zValidator('json', RazorpayCheckoutSchema), async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId, 'checkout', 5, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many checkout attempts')
  }

  const body = c.req.valid('json')
  if (body.couponCode) {
    const couponResult = await validateCoupon(body.couponCode, body.plan)
    if (!couponResult.valid) {
      return err(c, 422, couponResult.error ?? 'COUPON_INVALID', 'Coupon validation failed')
    }
  }

  const successUrl = `${env.APP_URL}/settings/billing?success=1`
  const cancelUrl = `${env.APP_URL}/settings/billing?cancelled=1`
  const email = ((c.get('userEmail' as never) as string | undefined) || `${userId}@unknown.local`).toString()
  const name = ((c.get('userName' as never) as string | undefined) || 'User').toString()

  const result = await initiateCheckout({
    userId,
    email,
    name,
    planName: body.plan,
    billingCycle: body.billingCycle,
    ...(body.couponCode !== undefined ? { couponCode: body.couponCode } : {}),
    successUrl,
    cancelUrl,
  })
  return ok(c, {
    checkoutData: result.checkoutData,
  })
})

routes.post('/portal', zValidator('json', portalSchema), async (c) => {
  void c.req.valid('json')
  return ok(c, { portalUrl: '/settings/billing' })
})

export default routes
