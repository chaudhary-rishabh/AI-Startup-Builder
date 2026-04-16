import { createNotification, countUnreadByUser } from '../db/queries/notifications.queries.js'
import { env } from '../config/env.js'
import { getRedis } from '../lib/redis.js'

import type { Notification } from '../db/schema.js'

export async function createInAppNotification(data: {
  userId: string
  type: string
  title: string
  body: string
  actionUrl?: string
  metadata?: Record<string, unknown>
}): Promise<Notification> {
  const notification = await createNotification({
    userId: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    actionUrl: data.actionUrl ?? null,
    metadata: data.metadata ?? {},
  })
  await getRedis().del(`notif:unread:${data.userId}`)
  return notification
}

export async function getUnreadCount(userId: string): Promise<number> {
  const redis = getRedis()
  const cacheKey = `notif:unread:${userId}`
  const cached = await redis.get(cacheKey)
  if (cached) return Number.parseInt(cached, 10)
  const count = await countUnreadByUser(userId)
  await redis.setex(cacheKey, env.UNREAD_COUNT_CACHE_TTL, String(count))
  return count
}
