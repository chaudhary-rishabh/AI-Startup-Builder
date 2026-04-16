import { sql } from 'drizzle-orm'
import { differenceInCalendarDays } from 'date-fns'

import { env } from '../config/env.js'
import { getReadReplica } from '../lib/readReplica.js'
import { getRedis } from '../lib/redis.js'
import { getUserEventTimeline } from '../db/queries/platformEvents.queries.js'

import type { PlatformEvent } from '../db/schema.js'

export interface UserActivitySummary {
  totalEvents: number
  firstSeenAt: string | null
  lastActiveAt: string | null
  agentRunsTotal: number
  projectsCreated: number
  phasesCompleted: number
  plan: string | null
}

export async function getUserTimeline(
  userId: string,
): Promise<{ events: PlatformEvent[]; summary: UserActivitySummary }> {
  const redis = getRedis()
  const cacheKey = `analytics:user-timeline:${userId}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached) as { events: PlatformEvent[]; summary: UserActivitySummary }

  const events = await getUserEventTimeline(userId, 100)
  const summary: UserActivitySummary = {
    totalEvents: events.length,
    firstSeenAt: events.length > 0 ? events[events.length - 1]!.createdAt.toISOString() : null,
    lastActiveAt: events.length > 0 ? events[0]!.createdAt.toISOString() : null,
    agentRunsTotal: events.filter((e) => e.eventType === 'agent.run.completed').length,
    projectsCreated: events.filter((e) => e.eventType === 'project.created').length,
    phasesCompleted: events.filter((e) => e.eventType === 'project.phase.advanced').length,
    plan:
      events.find((e) => e.eventType === 'plan.upgraded')?.properties?.['toPlan']?.toString() ??
      null,
  }
  const result = { events, summary }
  await redis.setex(cacheKey, env.USER_TIMELINE_CACHE_TTL, JSON.stringify(result))
  return result
}

export interface MyUsageView {
  projectCount: number
  activeProjectCount: number
  archivedProjectCount: number
  tokensUsedAllTime: number
  tokensUsedThisMonth: number
  agentRunsTotal: number
  agentRunsThisMonth: number
  phasesCompleted: number
  averageAgentRunMs: number
  mostUsedAgent: string | null
  lastActiveAt: string | null
  accountCreatedAt: string | null
  daysSinceSignup: number
}

export async function getMyUsage(userId: string): Promise<MyUsageView> {
  const redis = getRedis()
  const cacheKey = `analytics:my-usage:${userId}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached) as MyUsageView

  const db = getReadReplica()
  const [agentStatsRes, monthRunsRes, projectStatsRes, tokenRes, phaseRes, signupRes, lastActiveRes] =
    await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          AVG((properties->>'durationMs')::INT)::float AS avg_ms,
          MODE() WITHIN GROUP (ORDER BY COALESCE(properties->>'agentType', 'unknown')) AS most_used_agent
        FROM analytics.platform_events
        WHERE user_id = ${userId}::uuid
          AND event_type = 'agent.run.completed'
      `) as unknown as Promise<{ rows?: Array<{ total: number; avg_ms: number; most_used_agent: string | null }> }>,
      db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM analytics.platform_events
        WHERE user_id = ${userId}::uuid
          AND event_type = 'agent.run.completed'
          AND created_at >= DATE_TRUNC('month', NOW())
      `) as unknown as Promise<{ rows?: Array<{ total: number }> }>,
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status = 'archived')::int AS archived
        FROM projects.projects
        WHERE user_id = ${userId}::uuid
          AND deleted_at IS NULL
      `) as unknown as Promise<{ rows?: Array<{ total: number; active: number; archived: number }> }>,
      db.execute(sql`
        SELECT
          COALESCE(SUM(tokens_used), 0)::bigint AS all_time,
          COALESCE(MAX(CASE WHEN month = DATE_TRUNC('month', NOW())::date THEN tokens_used END), 0)::bigint AS this_month
        FROM billing.token_usage
        WHERE user_id = ${userId}::uuid
      `) as unknown as Promise<{ rows?: Array<{ all_time: string | number; this_month: string | number }> }>,
      db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM analytics.platform_events
        WHERE user_id = ${userId}::uuid
          AND event_type = 'project.phase.advanced'
      `) as unknown as Promise<{ rows?: Array<{ total: number }> }>,
      db.execute(sql`
        SELECT MIN(created_at) AS created_at
        FROM analytics.platform_events
        WHERE user_id = ${userId}::uuid
          AND event_type = 'user.signed_up'
      `) as unknown as Promise<{ rows?: Array<{ created_at: string | null }> }>,
      db.execute(sql`
        SELECT MAX(created_at) AS last_active
        FROM analytics.platform_events
        WHERE user_id = ${userId}::uuid
      `) as unknown as Promise<{ rows?: Array<{ last_active: string | null }> }>,
    ])

  const signupDate = signupRes.rows?.[0]?.created_at ? new Date(signupRes.rows[0].created_at) : null
  const result: MyUsageView = {
    projectCount: Number(projectStatsRes.rows?.[0]?.total ?? 0),
    activeProjectCount: Number(projectStatsRes.rows?.[0]?.active ?? 0),
    archivedProjectCount: Number(projectStatsRes.rows?.[0]?.archived ?? 0),
    tokensUsedAllTime: Number(tokenRes.rows?.[0]?.all_time ?? 0),
    tokensUsedThisMonth: Number(tokenRes.rows?.[0]?.this_month ?? 0),
    agentRunsTotal: Number(agentStatsRes.rows?.[0]?.total ?? 0),
    agentRunsThisMonth: Number(monthRunsRes.rows?.[0]?.total ?? 0),
    phasesCompleted: Number(phaseRes.rows?.[0]?.total ?? 0),
    averageAgentRunMs: Math.round(Number(agentStatsRes.rows?.[0]?.avg_ms ?? 0)),
    mostUsedAgent: agentStatsRes.rows?.[0]?.most_used_agent ?? null,
    lastActiveAt: lastActiveRes.rows?.[0]?.last_active ?? null,
    accountCreatedAt: signupDate ? signupDate.toISOString() : null,
    daysSinceSignup: signupDate ? Math.max(0, differenceInCalendarDays(new Date(), signupDate)) : 0,
  }

  await redis.setex(cacheKey, env.MY_USAGE_CACHE_TTL, JSON.stringify(result))
  return result
}
