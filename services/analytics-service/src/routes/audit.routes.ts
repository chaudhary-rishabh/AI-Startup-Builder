import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { err } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { queryAuditLogs } from '../services/auditLog.service.js'

const routes = new Hono()
routes.use('*', requireAuth)
routes.use('*', requireAdmin)

const querySchema = z.object({
  adminId: z.string().uuid().optional(),
  action: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(50),
})

async function rateLimitOk(userId: string): Promise<boolean> {
  const redis = getRedis()
  const key = `analytics:rl:audit:${userId}`
  const n = await redis.incr(key)
  if (n === 1) await redis.expire(key, 60)
  return n <= 30
}

routes.get('/audit-logs', zValidator('query', querySchema), async (c) => {
  const requesterId = c.get('userId' as never) as string
  if (!(await rateLimitOk(requesterId))) return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  const role = c.get('userRole' as never) as string
  if (role !== 'super_admin') {
    return err(c, 403, 'AUDIT_LOG_RESTRICTED', 'Audit logs are restricted to super admins')
  }

  const query = c.req.valid('query')
  const page = query.page ?? 1
  const limit = Math.min(query.limit ?? 50, 200)

  const result = await queryAuditLogs({
    ...(query.adminId !== undefined ? { adminId: query.adminId } : {}),
    ...(query.action !== undefined ? { action: query.action } : {}),
    ...(query.targetType !== undefined ? { targetType: query.targetType } : {}),
    ...(query.targetId !== undefined ? { targetId: query.targetId } : {}),
    ...(query.from !== undefined ? { fromDate: new Date(query.from) } : {}),
    ...(query.to !== undefined ? { toDate: new Date(`${query.to}T23:59:59.999Z`) } : {}),
    page,
    limit,
  })

  return c.json(
    {
      success: true,
      data: { auditLogs: result.data },
      meta: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    },
    200,
  )
})

export default routes
