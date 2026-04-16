import { sql } from 'drizzle-orm'

import type { DateRange } from '../lib/dateRange.js'
import { env } from '../config/env.js'
import { getReadReplica } from '../lib/readReplica.js'
import { getRedis } from '../lib/redis.js'

export interface KpiSummary {
  mau: number
  dauAverage: number
  newSignups: number
  totalProjects: number
  totalAgentRuns: number
  avgAgentRunsPerUser: number
  phasesCompleted: number
}

export interface KpiTimeSeries {
  summary: KpiSummary
  timeSeries: Array<{
    date: string
    dau: number
    newSignups: number
    projectsCreated: number
    agentRuns: number
    phaseCompletions: number
  }>
}

export async function getKpis(range: DateRange): Promise<KpiTimeSeries> {
  const redis = getRedis()
  const cacheKey = `analytics:kpis:${range.cacheKey}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached) as KpiTimeSeries

  const db = getReadReplica()

  const [mauRes, dauRes, eventRes] = await Promise.all([
    db.execute(sql`
      SELECT COUNT(DISTINCT user_id)::int AS mau
      FROM analytics.platform_events
      WHERE created_at >= ${range.fromDate.toISOString()}
        AND created_at <= ${range.toDate.toISOString()}
        AND user_id IS NOT NULL
    `) as unknown as Promise<{ rows?: Array<{ mau: number }> }>,
    db.execute(sql`
      SELECT DATE_TRUNC('day', created_at)::date::text AS day,
             COUNT(DISTINCT user_id)::int AS dau
      FROM analytics.platform_events
      WHERE created_at >= ${range.fromDate.toISOString()}
        AND created_at <= ${range.toDate.toISOString()}
        AND user_id IS NOT NULL
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY DATE_TRUNC('day', created_at) ASC
    `) as unknown as Promise<{ rows?: Array<{ day: string; dau: number }> }>,
    db.execute(sql`
      SELECT DATE_TRUNC(${range.granularity}, created_at)::date::text AS period,
             event_type,
             COUNT(*)::int AS count
      FROM analytics.platform_events
      WHERE created_at >= ${range.fromDate.toISOString()}
        AND created_at <= ${range.toDate.toISOString()}
        AND event_type IN ('user.signed_up', 'project.created', 'agent.ran', 'project.phase.advanced')
      GROUP BY period, event_type
      ORDER BY period ASC
    `) as unknown as Promise<{ rows?: Array<{ period: string; event_type: string; count: number }> }>,
  ])

  const mau = Number(mauRes.rows?.[0]?.mau ?? 0)
  const dauRows = dauRes.rows ?? []
  const dauMap = new Map(dauRows.map((r) => [r.day, Number(r.dau)]))
  const dauAverage =
    dauRows.length > 0 ? dauRows.reduce((acc, r) => acc + Number(r.dau), 0) / dauRows.length : 0

  const seriesMap = new Map<
    string,
    { date: string; dau: number; newSignups: number; projectsCreated: number; agentRuns: number; phaseCompletions: number }
  >()
  for (const row of eventRes.rows ?? []) {
    const date = row.period
    const existing = seriesMap.get(date) ?? {
      date,
      dau: dauMap.get(date) ?? 0,
      newSignups: 0,
      projectsCreated: 0,
      agentRuns: 0,
      phaseCompletions: 0,
    }
    const count = Number(row.count)
    if (row.event_type === 'user.signed_up') existing.newSignups += count
    if (row.event_type === 'project.created') existing.projectsCreated += count
    if (row.event_type === 'agent.ran') existing.agentRuns += count
    if (row.event_type === 'project.phase.advanced') existing.phaseCompletions += count
    seriesMap.set(date, existing)
  }

  const timeSeries = Array.from(seriesMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  const newSignups = timeSeries.reduce((acc, r) => acc + r.newSignups, 0)
  const totalProjects = timeSeries.reduce((acc, r) => acc + r.projectsCreated, 0)
  const totalAgentRuns = timeSeries.reduce((acc, r) => acc + r.agentRuns, 0)
  const phasesCompleted = timeSeries.reduce((acc, r) => acc + r.phaseCompletions, 0)

  const result: KpiTimeSeries = {
    summary: {
      mau,
      dauAverage: Math.round(dauAverage * 100) / 100,
      newSignups,
      totalProjects,
      totalAgentRuns,
      avgAgentRunsPerUser: mau > 0 ? Math.round((totalAgentRuns / mau) * 100) / 100 : 0,
      phasesCompleted,
    },
    timeSeries,
  }

  await redis.setex(cacheKey, env.KPI_CACHE_TTL, JSON.stringify(result))
  return result
}
