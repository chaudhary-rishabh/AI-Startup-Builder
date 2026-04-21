import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { env } from '../config/env.js'
import { publishCreditTopupCompleted } from '../events/publisher.js'
import { err, ok } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { createTopUpOrder, verifyPaymentSignature } from '../services/razorpay.service.js'
import { findCreditTopupByOrderId, updateCreditTopupCaptured } from '../db/queries/creditTopups.queries.js'
import { currentMonthDateString, getOrCreateMonthlyUsage, addBonusTokens } from '../db/queries/tokenUsage.queries.js'
import { TopUpOrderSchema, TopUpVerifySchema } from '../validators/billing.validators.js'

const routes = new Hono()
routes.use('*', requireAuth)

async function rateLimitOk(userId: string, bucket: string, max: number, windowSec: number): Promise<boolean> {
  const redis = getRedis()
  const k = `billing:rl:${bucket}:${userId}`
  const n = await redis.incr(k)
  if (n === 1) await redis.expire(k, windowSec)
  return n <= max
}

routes.post('/topup/order', zValidator('json', TopUpOrderSchema), async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId, 'topup-order', 10, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  }
  const body = c.req.valid('json')
  const result = await createTopUpOrder({ userId, packName: body.packName })
  return ok(c, {
    orderId: result.orderId,
    amountPaise: result.amountPaise,
    tokenGrant: result.tokenGrant,
    razorpayKeyId: env.RAZORPAY_KEY_ID,
  })
})

routes.post('/topup/verify', zValidator('json', TopUpVerifySchema), async (c) => {
  const userId = c.get('userId' as never) as string
  const body = c.req.valid('json')
  if (!verifyPaymentSignature(body.razorpayOrderId, body.razorpayPaymentId, body.razorpaySignature)) {
    return err(c, 400, 'INVALID_SIGNATURE', 'Payment signature verification failed')
  }
  const row = await findCreditTopupByOrderId(body.razorpayOrderId)
  if (!row || row.userId !== userId) {
    return err(c, 404, 'ORDER_NOT_FOUND', 'Top-up order not found')
  }
  await updateCreditTopupCaptured(body.razorpayOrderId, {
    razorpayPaymentId: body.razorpayPaymentId,
    completedAt: new Date(),
  })
  const month = currentMonthDateString()
  await getOrCreateMonthlyUsage(userId, month)
  const updated = await addBonusTokens(userId, month, BigInt(row.tokensGranted))
  const redis = getRedis()
  await redis.del(`billing:budget:${userId}`)
  const userEmail = (c.get('userEmail' as never) as string | undefined) ?? ''
  const userName = (c.get('userName' as never) as string | undefined) ?? ''
  await publishCreditTopupCompleted({
    userId: row.userId,
    tokensGranted: Number(row.tokensGranted),
    packName: row.packName,
    amountPaise: row.amountPaise,
    ...(userEmail !== '' ? { userEmail, userName } : {}),
  })
  return ok(c, {
    success: true,
    tokensGranted: row.tokensGranted,
    newBonusTotal: Number(updated.bonusTokens),
  })
})

export default routes
