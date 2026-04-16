import { sql } from 'drizzle-orm'

import type { DateRange } from '../lib/dateRange.js'
import { env } from '../config/env.js'
import { getReadReplica } from '../lib/readReplica.js'
import { getRedis } from '../lib/redis.js'

export interface AgentMetrics {
  agentType: string
  totalRuns: number
  successRuns: number
  failedRuns: number
  successRate: number
  avgDurationMs: number
  p50DurationMs: number
  p95DurationMs: number
  avgTokensPerRun: number
  avgCostUsd: number
  errorBreakdown: Record<string, number>
}

export async function getAgentPerformance(
  range: DateRange,
): Promise<{ agents: AgentMetrics[]; totalRuns: number; overallSuccessRate: number }> {
  const redis = getRedis()
  const cacheKey = `analytics:agent-perf:${range.cacheKey}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached) as { agents: AgentMetrics[]; totalRuns: number; overallSuccessRate: number }

  const db = getReadReplica()
  const [mainRes, errorRes] = await Promise.all([
    db.execute(sql`
      SELECT
        properties->>'agentType' AS agent_type,
        COUNT(*)::int AS total_runs,
        COUNT(*) FILTER (WHERE properties->>'status' = 'completed')::int AS success_runs,
        COUNT(*) FILTER (WHERE properties->>'status' = 'failed')::int AS failed_runs,
        AVG((properties->>'durationMs')::BIGINT)::float AS avg_duration_ms,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (properties->>'durationMs')::BIGINT)::float AS p50_duration_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (properties->>'durationMs')::BIGINT)::float AS p95_duration_ms,
        AVG((properties->>'tokensUsed')::BIGINT)::float AS avg_tokens,
        AVG((properties->>'costUsd')::DECIMAL)::float AS avg_cost_usd
      FROM analytics.platform_events
      WHERE event_type = 'agent.run.completed'
        AND created_at >= ${range.fromDate.toISOString()}
        AND created_at <= ${range.toDate.toISOString()}
        AND properties->>'agentType' IS NOT NULL
      GROUP BY properties->>'agentType'
      ORDER BY total_runs DESC
    `) as unknown as Promise<{
      rows?: Array<{
        agent_type: string
        total_runs: number
        success_runs: number
        failed_runs: number
        avg_duration_ms: number
        p50_duration_ms: number
        p95_duration_ms: number
        avg_tokens: number
        avg_cost_usd: number
      }>
    }>,
    db.execute(sql`
      SELECT
        properties->>'agentType' AS agent_type,
        COALESCE(properties->>'errorCode', 'unknown') AS error_code,
        COUNT(*)::int AS count
      FROM analytics.platform_events
      WHERE event_type = 'agent.run.completed'
        AND created_at >= ${range.fromDate.toISOString()}
        AND created_at <= ${range.toDate.toISOString()}
        AND properties->>'status' = 'failed'
      GROUP BY properties->>'agentType', COALESCE(properties->>'errorCode', 'unknown')
    `) as unknown as Promise<{ rows?: Array<{ agent_type: string; error_code: string; count: number }> }>,
  ])

  const errorMap = new Map<string, Record<string, number>>()
  for (const row of errorRes.rows ?? []) {
    const current = errorMap.get(row.agent_type) ?? {}
    current[row.error_code] = Number(row.count)
    errorMap.set(row.agent_type, current)
  }

  const agents = (mainRes.rows ?? []).map((row) => ({
    agentType: row.agent_type,
    totalRuns: Number(row.total_runs),
    successRuns: Number(row.success_runs),
    failedRuns: Number(row.failed_runs),
    successRate: row.total_runs > 0 ? Math.round((Number(row.success_runs) / Number(row.total_runs)) * 10000) / 100 : 0,
    avgDurationMs: Math.round(Number(row.avg_duration_ms ?? 0)),
    p50DurationMs: Math.round(Number(row.p50_duration_ms ?? 0)),
    p95DurationMs: Math.round(Number(row.p95_duration_ms ?? 0)),
    avgTokensPerRun: Math.round(Number(row.avg_tokens ?? 0)),
    avgCostUsd: Math.round(Number(row.avg_cost_usd ?? 0) * 1_000_000) / 1_000_000,
    errorBreakdown: errorMap.get(row.agent_type) ?? {},
  }))

  const totalRuns = agents.reduce((acc, a) => acc + a.totalRuns, 0)
  const totalSuccess = agents.reduce((acc, a) => acc + a.successRuns, 0)
  const result = {
    agents,
    totalRuns,
    overallSuccessRate: totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 10000) / 100 : 0,
  }

  await redis.setex(cacheKey, env.AGENT_PERF_CACHE_TTL, JSON.stringify(result))
  return result
}
