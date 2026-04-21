import { Hono } from 'hono'
import { z } from 'zod'

import { env } from '../config/env.js'
import { findTransactionsByUserId } from '../db/queries/transactions.queries.js'
import { err, ok } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { requireAuth } from '../middleware/requireAuth.js'

const routes = new Hono()
routes.use('*', requireAuth)

const limitSchema = z.coerce.number().int().min(1).max(50).default(10)

async function rateLimitOk(userId: string, bucket: string, max: number, windowSec: number): Promise<boolean> {
  const redis = getRedis()
  const k = `billing:rl:${bucket}:${userId}`
  const n = await redis.incr(k)
  if (n === 1) await redis.expire(k, windowSec)
  return n <= max
}

routes.get('/invoices', async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId, 'invoices', 30, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  }

  const redis = getRedis()
  const cacheKey = `billing:invoices:${userId}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    try {
      return ok(c, JSON.parse(cached) as { invoices: unknown[] })
    } catch {
      // continue
    }
  }

  const parsedLimit = limitSchema.safeParse(c.req.query('limit') ?? '10')
  const limit = parsedLimit.success ? parsedLimit.data : 10
  const { data: rows } = await findTransactionsByUserId(userId, { limit, page: 1 })
  const invoices = rows.map((tx) => ({
    id: tx.id,
    number: tx.stripeInvoiceId ?? tx.razorpayPaymentId ?? tx.id,
    amountPaid: tx.amountCents,
    currency: tx.currency,
    status: tx.status,
    periodStart: null as string | null,
    periodEnd: null as string | null,
    pdfUrl: tx.invoicePdfUrl,
    hostedInvoiceUrl: tx.invoicePdfUrl,
    createdAt: tx.createdAt.toISOString(),
    razorpayPaymentId: tx.razorpayPaymentId,
  }))
  const payload = { invoices }
  await redis.setex(cacheKey, Math.max(120, env.SUBSCRIPTION_CACHE_TTL), JSON.stringify(payload))
  return ok(c, payload)
})

export default routes
