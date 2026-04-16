import { sql } from 'drizzle-orm'

import type { DateRange } from '../lib/dateRange.js'
import { env } from '../config/env.js'
import { getReadReplica } from '../lib/readReplica.js'
import { getRedis } from '../lib/redis.js'

export interface TokenUsageSummary {
  totalTokens: number
  totalCostUsd: number
  byPlan: Record<string, { tokens: number; cost: number; users: number }>
  byModel: Record<string, { tokens: number; cost: number; runs: number }>
  byAgent: Record<string, { tokens: number; avgTokens: number; runs: number }>
  timeSeries: Array<{ date: string; totalTokens: number; totalCostUsd: number; uniqueUsers: number }>
}

export async function getTokenUsageAnalytics(range: DateRange): Promise<TokenUsageSummary> {
  const redis = getRedis()
  const cacheKey = `analytics:token-usage:${range.cacheKey}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached) as TokenUsageSummary

  const db = getReadReplica()
  const [totalsRes, byModelRes, byAgentRes, seriesRes, byPlanRes] = await Promise.all([
    db.execute(sql`
      SELECT
        COALESCE(SUM((properties->>'tokensUsed')::BIGINT), 0)::bigint AS total_tokens,
        COALESCE(SUM((properties->>'costUsd')::DECIMAL), 0)::float AS total_cost
      FROM analytics.platform_events
      WHERE event_type = 'agent.run.completed'
        AND created_at >= ${range.fromDate.toISOString()}
        AND created_at <= ${range.toDate.toISOString()}
    `) as unknown as Promise<{ rows?: Array<{ total_tokens: string | number; total_cost: number }> }>,
    db.execute(sql`
      SELECT
        COALESCE(properties->>'model', 'unknown') AS model,
        COALESCE(SUM((properties->>'tokensUsed')::BIGINT), 0)::bigint AS tokens,
        COALESCE(SUM((properties->>'costUsd')::DECIMAL), 0)::float AS cost,
        COUNT(*)::int AS runs
      FROM analytics.platform_events
      WHERE event_type = 'agent.run.completed'
        AND created_at >= ${range.fromDate.toISOString()}
        AND created_at <= ${range.toDate.toISOString()}
      GROUP BY COALESCE(properties->>'model', 'unknown')
    `) as unknown as Promise<{ rows?: Array<{ model: string; tokens: string | number; cost: number; runs: number }> }>,
    db.execute(sql`
      SELECT
        COALESCE(properties->>'agentType', 'unknown') AS agent_type,
        COALESCE(SUM((properties->>'tokensUsed')::BIGINT), 0)::bigint AS tokens,
        COUNT(*)::int AS runs
      FROM analytics.platform_events
      WHERE event_type = 'agent.run.completed'
        AND created_at >= ${range.fromDate.toISOString()}
        AND created_at <= ${range.toDate.toISOString()}
      GROUP BY COALESCE(properties->>'agentType', 'unknown')
    `) as unknown as Promise<{ rows?: Array<{ agent_type: string; tokens: string | number; runs: number }> }>,
    db.execute(sql`
      SELECT
        DATE_TRUNC('day', created_at)::date::text AS date,
        COALESCE(SUM((properties->>'tokensUsed')::BIGINT), 0)::bigint AS total_tokens,
        COALESCE(SUM((properties->>'costUsd')::DECIMAL), 0)::float AS total_cost,
        COUNT(DISTINCT user_id)::int AS unique_users
      FROM analytics.platform_events
      WHERE event_type = 'agent.run.completed'
        AND created_at >= ${range.fromDate.toISOString()}
        AND created_at <= ${range.toDate.toISOString()}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY DATE_TRUNC('day', created_at) ASC
    `) as unknown as Promise<{ rows?: Array<{ date: string; total_tokens: string | number; total_cost: number; unique_users: number }> }>,
    db.execute(sql`
      SELECT
        p.name AS plan_name,
        COALESCE(SUM(tu.tokens_used), 0)::bigint AS tokens,
        COUNT(DISTINCT tu.user_id)::int AS users
      FROM billing.token_usage tu
      JOIN billing.subscriptions s ON s.user_id = tu.user_id
      JOIN billing.plans p ON s.plan_id = p.id
      WHERE tu.month = DATE_TRUNC('month', ${range.toDate.toISOString()}::timestamptz)::date
      GROUP BY p.name
    `) as unknown as Promise<{ rows?: Array<{ plan_name: string; tokens: string | number; users: number }> }>,
  ])

  const byModel: TokenUsageSummary['byModel'] = {}
  for (const row of byModelRes.rows ?? []) {
    byModel[row.model] = {
      tokens: Number(row.tokens),
      cost: Number(row.cost ?? 0),
      runs: Number(row.runs),
    }
  }

  const byAgent: TokenUsageSummary['byAgent'] = {}
  for (const row of byAgentRes.rows ?? []) {
    const tokens = Number(row.tokens)
    const runs = Number(row.runs)
    byAgent[row.agent_type] = {
      tokens,
      runs,
      avgTokens: runs > 0 ? Math.round(tokens / runs) : 0,
    }
  }

  const byPlan: TokenUsageSummary['byPlan'] = {}
  for (const row of byPlanRes.rows ?? []) {
    byPlan[row.plan_name] = {
      tokens: Number(row.tokens),
      users: Number(row.users),
      cost: 0,
    }
  }

  const result: TokenUsageSummary = {
    totalTokens: Number(totalsRes.rows?.[0]?.total_tokens ?? 0),
    totalCostUsd: Number(totalsRes.rows?.[0]?.total_cost ?? 0),
    byPlan,
    byModel,
    byAgent,
    timeSeries: (seriesRes.rows ?? []).map((row) => ({
      date: row.date,
      totalTokens: Number(row.total_tokens),
      totalCostUsd: Number(row.total_cost ?? 0),
      uniqueUsers: Number(row.unique_users),
    })),
  }

  await redis.setex(cacheKey, env.TOKEN_USAGE_CACHE_TTL, JSON.stringify(result))
  return result
}
