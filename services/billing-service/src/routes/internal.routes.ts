import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { err, ok } from '../lib/response.js'

const IncrementSchema = z.object({
  userId: z.string().uuid(),
  tokensUsed: z.coerce.number().int().min(0),
  costUsd: z.string(),
})

const routes = new Hono()

routes.get('/token-budget', async (c) => {
  const userId = c.req.query('userId')
  const parsed = z.string().uuid().safeParse(userId)
  if (!parsed.success) {
    return err(c, 400, 'VALIDATION_ERROR', 'Query parameter userId (uuid) is required')
  }

  const resetAt = new Date()
  resetAt.setUTCMonth(resetAt.getUTCMonth() + 1)
  resetAt.setUTCDate(1)
  resetAt.setUTCHours(0, 0, 0, 0)

  return ok(c, {
    tokensUsed: 0,
    tokensLimit: 50_000,
    resetAt: resetAt.toISOString(),
  })
})

routes.post('/token-usage/increment', zValidator('json', IncrementSchema), async (c) => {
  const body = c.req.valid('json')
  console.info('[billing-service] token-usage/increment', {
    userId: body.userId,
    tokensUsed: body.tokensUsed,
    costUsd: body.costUsd,
  })
  return ok(c, { updated: true })
})

export default routes
