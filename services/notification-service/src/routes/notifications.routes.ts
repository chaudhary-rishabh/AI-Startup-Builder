import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import {
  deleteNotification,
  findNotificationsByUser,
  markAllAsRead,
  markAsRead,
} from '../db/queries/notifications.queries.js'
import { ok, err } from '../lib/response.js'
import { getRedis } from '../lib/redis.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { getUnreadCount } from '../services/inApp.service.js'

const routes = new Hono()
routes.use('*', requireAuth)

async function rateLimitOk(userId: string, bucket: string, max: number, windowSec: number): Promise<boolean> {
  const redis = getRedis()
  const key = `notif:rl:${bucket}:${userId}`
  const n = await redis.incr(key)
  if (n === 1) await redis.expire(key, windowSec)
  return n <= max
}

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
  isRead: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  type: z.string().optional(),
})

routes.get('/', zValidator('query', listQuerySchema), async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId, 'list', 60, 60))) return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  const query = c.req.valid('query')
  const limit = Math.min(query.limit ?? 20, 50)
  const result = await findNotificationsByUser(userId, {
    ...(query.cursor !== undefined ? { cursor: query.cursor } : {}),
    limit,
    ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
    ...(query.type !== undefined ? { type: query.type } : {}),
  })
  return ok(c, {
    notifications: result.data,
    nextCursor: result.nextCursor,
    hasMore: result.nextCursor !== null,
  })
})

routes.get('/unread-count', async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId, 'unread-count', 60, 60))) {
    return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  }
  const count = await getUnreadCount(userId)
  return ok(c, { count })
})

const idSchema = z.object({ id: z.string().uuid() })

routes.post('/:id/read', zValidator('param', idSchema), async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId, 'read-one', 60, 60))) return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  const { id } = c.req.valid('param')
  const notification = await markAsRead(id, userId)
  if (!notification) return err(c, 404, 'NOTIFICATION_NOT_FOUND', 'Notification not found')
  await getRedis().del(`notif:unread:${userId}`)
  return ok(c, {
    notificationId: id,
    isRead: true,
    readAt: notification.readAt,
  })
})

routes.post('/read-all', async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId, 'read-all', 10, 60))) return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  const markedCount = await markAllAsRead(userId)
  await getRedis().del(`notif:unread:${userId}`)
  return ok(c, {
    markedCount,
    message: `${markedCount} notification${markedCount !== 1 ? 's' : ''} marked as read`,
  })
})

routes.delete('/:id', zValidator('param', idSchema), async (c) => {
  const userId = c.get('userId' as never) as string
  if (!(await rateLimitOk(userId, 'delete', 30, 60))) return err(c, 429, 'RATE_LIMIT', 'Too many requests')
  const { id } = c.req.valid('param')
  const deleted = await deleteNotification(id, userId)
  if (!deleted) return err(c, 404, 'NOTIFICATION_NOT_FOUND', 'Notification not found')
  await getRedis().del(`notif:unread:${userId}`)
  return ok(c, {
    notificationId: id,
    message: 'Notification deleted',
  })
})

export default routes
