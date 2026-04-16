import { zValidator } from '@hono/zod-validator'
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import { env } from '../config/env.js'
import { validateDateRange } from '../lib/dateRange.js'
import { getReadReplica } from '../lib/readReplica.js'
import { ok, err } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { requireAuth } from '../middleware/requireAuth.js'

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
  const key = `analytics:rl:revenue:${userId}`
  const n = await redis.incr(key)
  if (n === 1) await redis.expire(key, 60)
  return n <= 30
}

routes.get('/revenue', zValidator('query', querySchema), async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId))) return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  const query = c.req.valid('query')
  const range = validateDateRange(query.from, query.to, query.granularity)

  const redis = getRedis()
  const cacheKey = `analytics:revenue:${range.cacheKey}`
  const cached = await redis.get(cacheKey)
  if (cached) return ok(c, JSON.parse(cached) as unknown)

  const db = getReadReplica()
  const [summaryRes, seriesRes] = await Promise.all([
    db.execute(sql`
      SELECT
        COALESCE(SUM(
          CASE
            WHEN sub.billing_cycle = 'monthly' THEN p.price_monthly_cents
            WHEN sub.billing_cycle = 'yearly' THEN p.price_yearly_cents / 12
            ELSE 0
          END
        ), 0)::bigint AS mrr_cents,
        COUNT(*) FILTER (
          WHERE sub.status = 'active' AND sub.stripe_subscription_id IS NOT NULL
        )::int AS paid_subscribers
      FROM billing.subscriptions sub
      JOIN billing.plans p ON sub.plan_id = p.id
      WHERE sub.status = 'active'
    `) as unknown as Promise<{ rows?: Array<{ mrr_cents: string | number; paid_subscribers: number }> }>,
    db.execute(sql`
      SELECT
        DATE_TRUNC(${range.granularity}, created_at)::date::text AS period,
        COALESCE(SUM(amount_cents), 0)::bigint AS revenue_cents,
        COUNT(*)::int AS transactions
      FROM billing.transactions
      WHERE status = 'succeeded'
        AND created_at >= ${range.fromDate.toISOString()}
        AND created_at <= ${range.toDate.toISOString()}
      GROUP BY DATE_TRUNC(${range.granularity}, created_at)
      ORDER BY DATE_TRUNC(${range.granularity}, created_at) ASC
    `) as unknown as Promise<{ rows?: Array<{ period: string; revenue_cents: string | number; transactions: number }> }>,
  ])

  const result = {
    summary: {
      currentMrr: Number(summaryRes.rows?.[0]?.mrr_cents ?? 0),
      paidSubscribers: Number(summaryRes.rows?.[0]?.paid_subscribers ?? 0),
    },
    timeSeries: (seriesRes.rows ?? []).map((row) => ({
      period: row.period,
      revenueCents: Number(row.revenue_cents),
      transactions: Number(row.transactions),
    })),
  }
  await redis.setex(cacheKey, env.REVENUE_CACHE_TTL, JSON.stringify(result))
  return ok(c, result)
})

export default routes
