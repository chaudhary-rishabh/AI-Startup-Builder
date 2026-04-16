import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'

import { logger } from '../../lib/logger.js'
import { getDb } from '../../lib/db.js'
import { getReadReplica } from '../../lib/readReplica.js'
import { platformEvents } from '../schema.js'

import type { NewPlatformEvent, PlatformEvent } from '../schema.js'

export async function insertEvent(data: NewPlatformEvent): Promise<void> {
  try {
    await getDb().insert(platformEvents).values(data)
  } catch (error) {
    logger.error('insertEvent failed', { error, eventType: data.eventType })
  }
}

export async function insertEventsBatch(events: NewPlatformEvent[]): Promise<void> {
  if (events.length === 0) return
  const chunk = events.slice(0, 100)
  await getDb().insert(platformEvents).values(chunk)
}

export async function getTimeSeriesEvents(params: {
  fromDate: Date
  toDate: Date
  granularity: 'day' | 'week' | 'month'
  eventTypes?: string[]
}): Promise<Array<{ period: string; eventType: string; count: number }>> {
  const db = getReadReplica()
  const periodExpr =
    params.granularity === 'day'
      ? sql`DATE_TRUNC('day', created_at)`
      : params.granularity === 'week'
        ? sql`DATE_TRUNC('week', created_at)`
        : sql`DATE_TRUNC('month', created_at)`
  const where = [
    gte(platformEvents.createdAt, params.fromDate),
    lte(platformEvents.createdAt, params.toDate),
    ...(params.eventTypes ? [inArray(platformEvents.eventType, params.eventTypes)] : []),
  ]
  const rows = (await db.execute(sql`
    SELECT ${periodExpr} AS period, event_type, COUNT(*)::int AS count
    FROM analytics.platform_events
    WHERE created_at >= ${params.fromDate.toISOString()}
      AND created_at <= ${params.toDate.toISOString()}
      ${params.eventTypes ? sql`AND event_type = ANY(${params.eventTypes})` : sql``}
    GROUP BY period, event_type
    ORDER BY period ASC
  `)) as unknown as { rows?: Array<{ period: string; event_type: string; count: number }> }
  return (rows.rows ?? []).map((r) => ({ period: r.period, eventType: r.event_type, count: Number(r.count) }))
}

export async function getUniqueDailyUsers(
  fromDate: Date,
  toDate: Date,
): Promise<Array<{ date: string; dau: number }>> {
  const rows = (await getReadReplica().execute(sql`
    SELECT DATE_TRUNC('day', created_at)::date::text AS date,
           COUNT(DISTINCT user_id)::int AS dau
    FROM analytics.platform_events
    WHERE created_at >= ${fromDate.toISOString()}
      AND created_at <= ${toDate.toISOString()}
      AND user_id IS NOT NULL
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY DATE_TRUNC('day', created_at) ASC
  `)) as unknown as { rows?: Array<{ date: string; dau: number }> }
  return (rows.rows ?? []).map((r) => ({ date: r.date, dau: Number(r.dau) }))
}

export async function getUserFunnelCohort(
  fromDate: Date,
  toDate: Date,
): Promise<Array<{ userId: string; events: string[] }>> {
  const rows = (await getReadReplica().execute(sql`
    WITH cohort AS (
      SELECT user_id
      FROM analytics.platform_events
      WHERE event_type = 'user.signed_up'
        AND created_at >= ${fromDate.toISOString()}
        AND created_at <= ${toDate.toISOString()}
        AND user_id IS NOT NULL
      GROUP BY user_id
    )
    SELECT pe.user_id::text AS user_id,
           ARRAY_AGG(pe.event_type ORDER BY pe.created_at ASC) AS events
    FROM analytics.platform_events pe
    JOIN cohort c ON c.user_id = pe.user_id
    GROUP BY pe.user_id
  `)) as unknown as { rows?: Array<{ user_id: string; events: string[] }> }
  return (rows.rows ?? []).map((r) => ({ userId: r.user_id, events: r.events ?? [] }))
}

export async function getEventCountsByType(
  fromDate: Date,
  toDate: Date,
): Promise<Record<string, number>> {
  const rows = (await getReadReplica().execute(sql`
    SELECT event_type, COUNT(*)::int AS count
    FROM analytics.platform_events
    WHERE created_at >= ${fromDate.toISOString()}
      AND created_at <= ${toDate.toISOString()}
    GROUP BY event_type
  `)) as unknown as { rows?: Array<{ event_type: string; count: number }> }
  const result: Record<string, number> = {}
  for (const row of rows.rows ?? []) {
    result[row.event_type] = Number(row.count)
  }
  return result
}

export async function getUserEventTimeline(userId: string, limit: number): Promise<PlatformEvent[]> {
  return getReadReplica()
    .select()
    .from(platformEvents)
    .where(eq(platformEvents.userId, userId))
    .orderBy(desc(platformEvents.createdAt))
    .limit(limit)
}
