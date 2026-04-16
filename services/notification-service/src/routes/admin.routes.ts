import { zValidator } from '@hono/zod-validator'
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import { accepted, err } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { getDb } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { emailQueue } from '../queues/email.queue.js'
import { notificationQueue } from '../queues/notification.queue.js'

const routes = new Hono()
routes.use('*', requireAuth)
routes.use('*', requireAdmin)

async function rateLimitOk(userId: string, max: number, windowSec: number): Promise<boolean> {
  const redis = getRedis()
  const key = `notif:rl:admin-send:${userId}`
  const n = await redis.incr(key)
  if (n === 1) await redis.expire(key, windowSec)
  return n <= max
}

const broadcastSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(1000),
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(1000),
  channel: z.enum(['in_app', 'email', 'both']),
  template: z.string().optional(),
  actionUrl: z.string().url().optional(),
  emailProps: z.record(z.unknown()).optional(),
})

async function lookupUser(
  userId: string,
): Promise<{ email: string; name: string } | null> {
  const db = getDb()
  const res = (await db.execute(sql`
    SELECT email, full_name
    FROM auth.users
    WHERE id = ${userId}::uuid
    LIMIT 1
  `)) as unknown as { rows?: Array<{ email: string; full_name: string }> }
  const row = res.rows?.[0]
  if (!row) return null
  return { email: row.email, name: row.full_name ?? 'User' }
}

routes.post('/admin/send', zValidator('json', broadcastSchema), async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId, 5, 60))) return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  const body = c.req.valid('json')
  let sent = 0
  let failed = 0
  const jobId = `admin-send-${Date.now()}`

  for (const uid of body.userIds) {
    try {
      if (body.channel === 'in_app' || body.channel === 'both') {
        await notificationQueue.add('admin-broadcast', {
          userId: uid,
          type: 'system_alert',
          title: body.title,
          body: body.body,
          actionUrl: body.actionUrl ?? null,
          metadata: { adminBroadcast: true },
        })
      }

      if (body.channel === 'email' || body.channel === 'both') {
        const targetUser = await lookupUser(uid)
        if (targetUser) {
          await emailQueue.add(
            'admin-email',
            {
              to: targetUser.email,
              userId: uid,
              template: body.template ?? 'admin_plain',
              props: {
                title: body.title,
                plainBody: body.body,
                actionUrl: body.actionUrl ?? null,
                ...body.emailProps,
              },
            },
            { priority: 10 },
          )
        }
      }
      sent += 1
    } catch (error) {
      failed += 1
      logger.warn('Admin broadcast enqueue failed for user', { uid, error })
    }
  }

  return accepted(c, {
    sent,
    failed,
    jobId,
    message: `Queued ${sent} notification${sent !== 1 ? 's' : ''}.`,
  })
})

export default routes
