import { and, eq } from 'drizzle-orm'

import { reEngagementJobs } from '../db/schema.js'
import { getDb } from '../lib/db.js'
import { getRedis } from '../lib/redis.js'
import { logger } from '../lib/logger.js'

export async function scheduleReEngagementEmails(userId: string): Promise<void> {
  const db = getDb()
  const existing = await db
    .select({ id: reEngagementJobs.id })
    .from(reEngagementJobs)
    .where(and(eq(reEngagementJobs.userId, userId), eq(reEngagementJobs.status, 'pending')))
    .limit(1)
  if (existing.length > 0) return

  const day3 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  const day7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await db.insert(reEngagementJobs).values([
    { userId, sendAt: day3, template: 'credits_exhausted_day3', status: 'pending' },
    { userId, sendAt: day7, template: 'credits_exhausted_day7', status: 'pending' },
  ])

  const redis = getRedis()
  await redis.setex(`re_engagement:scheduled:${userId}`, 30 * 24 * 60 * 60, '1')
  logger.info('Scheduled re-engagement jobs', { userId })
}

export async function cancelReEngagementEmails(userId: string): Promise<void> {
  const db = getDb()
  await db
    .update(reEngagementJobs)
    .set({ status: 'cancelled' })
    .where(and(eq(reEngagementJobs.userId, userId), eq(reEngagementJobs.status, 'pending')))
  const redis = getRedis()
  await redis.del(`re_engagement:scheduled:${userId}`)
}
