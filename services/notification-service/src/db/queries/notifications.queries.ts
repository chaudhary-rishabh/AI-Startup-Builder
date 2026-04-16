import { and, count, desc, eq, lt } from 'drizzle-orm'

import { getDb } from '../../lib/db.js'
import { notifications } from '../schema.js'

import type { NewNotification, Notification } from '../schema.js'

export async function createNotification(data: NewNotification): Promise<Notification> {
  const db = getDb()
  const [row] = await db.insert(notifications).values(data).returning()
  if (!row) throw new Error('createNotification: insert returned no row')
  return row
}

export async function findNotificationsByUser(
  userId: string,
  opts: {
    cursor?: string
    limit?: number
    isRead?: boolean
    type?: string
  },
): Promise<{ data: Notification[]; nextCursor: string | null }> {
  const db = getDb()
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20))

  const where = [
    eq(notifications.userId, userId),
    ...(opts.isRead !== undefined ? [eq(notifications.isRead, opts.isRead)] : []),
    ...(opts.type ? [eq(notifications.type, opts.type)] : []),
    ...(opts.cursor ? [lt(notifications.createdAt, new Date(opts.cursor))] : []),
  ]

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...where))
    .orderBy(desc(notifications.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? data[data.length - 1]?.createdAt.toISOString() ?? null : null
  return { data, nextCursor }
}

export async function countUnreadByUser(userId: string): Promise<number> {
  const db = getDb()
  const [row] = await db
    .select({ c: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
  return Number(row?.c ?? 0)
}

export async function markAsRead(id: string, userId: string): Promise<Notification | undefined> {
  const db = getDb()
  const [row] = await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning()
  return row
}

export async function markAllAsRead(userId: string): Promise<number> {
  const db = getDb()
  const rows = await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .returning({ id: notifications.id })
  return rows.length
}

export async function deleteNotification(id: string, userId: string): Promise<boolean> {
  const db = getDb()
  const rows = await db
    .delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning({ id: notifications.id })
  return rows.length > 0
}
