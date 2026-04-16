import { eq } from 'drizzle-orm'

import { getDb } from '../../lib/db.js'
import { getRedis } from '../../lib/redis.js'
import { notificationPrefs } from '../schema.js'

import type { NotificationPrefs, NotificationPrefsUpdate } from '../schema.js'

export async function findOrCreatePrefs(userId: string): Promise<NotificationPrefs> {
  const db = getDb()
  await db.insert(notificationPrefs).values({ userId }).onConflictDoNothing()
  const [row] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId)).limit(1)
  if (!row) throw new Error('findOrCreatePrefs: failed to create or load preferences')
  return row
}

export async function updatePrefs(
  userId: string,
  data: Partial<NotificationPrefsUpdate> & { securityAlerts?: boolean },
): Promise<NotificationPrefs> {
  const db = getDb()
  const { securityAlerts: _ignored, ...rest } = data
  const [row] = await db
    .update(notificationPrefs)
    .set({
      ...rest,
      updatedAt: new Date(),
    })
    .where(eq(notificationPrefs.userId, userId))
    .returning()
  const prefs = row ?? (await findOrCreatePrefs(userId))
  await getRedis().del(`notif:prefs:${userId}`)
  return prefs
}
