import { sql } from 'drizzle-orm'

import { getReadReplica } from '../lib/readReplica.js'
import { getRedis } from '../lib/redis.js'

export interface AIUsageOverviewResult {
  tokensToday: number
  tokensThisMonth: number
  projectedCostUsd: number
  costThisMonthUsd: number
  exhaustedUsersCount: number
}

export async function getAIUsageOverview(fromIso: string, toIso: string): Promise<AIUsageOverviewResult> {
  const redis = getRedis()
  const cacheKey = `analytics:ai-usage-overview:${fromIso}:${toIso}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    try {
      return JSON.parse(cached) as AIUsageOverviewResult
    } catch {
      // continue
    }
  }

  const db = getReadReplica()
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))

  const [todayRes, monthRes, rangeRes, exhaustedRes] = await Promise.all([
    db.execute(sql`
      SELECT COALESCE(SUM((properties->>'tokensUsed')::BIGINT), 0)::bigint AS tokens,
             COALESCE(SUM((properties->>'costUsd')::DECIMAL), 0)::float AS cost
      FROM analytics.platform_events
      WHERE event_type = 'agent.run.completed'
        AND created_at >= ${todayStart.toISOString()}
        AND created_at <= ${now.toISOString()}
    `) as unknown as Promise<{ rows?: Array<{ tokens: string | number; cost: number }> }>,
    db.execute(sql`
      SELECT COALESCE(SUM((properties->>'tokensUsed')::BIGINT), 0)::bigint AS tokens,
             COALESCE(SUM((properties->>'costUsd')::DECIMAL), 0)::float AS cost
      FROM analytics.platform_events
      WHERE event_type = 'agent.run.completed'
        AND created_at >= ${monthStart.toISOString()}
        AND created_at <= ${now.toISOString()}
    `) as unknown as Promise<{ rows?: Array<{ tokens: string | number; cost: number }> }>,
    db.execute(sql`
      SELECT COALESCE(SUM((properties->>'tokensUsed')::BIGINT), 0)::bigint AS tokens,
             COALESCE(SUM((properties->>'costUsd')::DECIMAL), 0)::float AS cost
      FROM analytics.platform_events
      WHERE event_type = 'agent.run.completed'
        AND created_at >= ${fromIso}
        AND created_at <= ${toIso}
    `) as unknown as Promise<{ rows?: Array<{ tokens: string | number; cost: number }> }>,
    db.execute(sql`
      SELECT COUNT(DISTINCT tu.user_id)::int AS exhausted_users
      FROM billing.token_usage tu
      JOIN billing.subscriptions s ON s.user_id = tu.user_id
      WHERE tu.month = date_trunc('month', NOW())::date
        AND (tu.tokens_limit + tu.bonus_tokens) > 0
        AND tu.tokens_used >= (tu.tokens_limit + tu.bonus_tokens)
    `) as unknown as Promise<{ rows?: Array<{ exhausted_users: number }> }>,
  ])

  const tokensToday = Number(todayRes.rows?.[0]?.tokens ?? 0)
  const tokensThisMonth = Number(monthRes.rows?.[0]?.tokens ?? 0)
  const costThisMonthUsd = Number(monthRes.rows?.[0]?.cost ?? 0)

  const rangeTokens = Number(rangeRes.rows?.[0]?.tokens ?? 0)
  const rangeCost = Number(rangeRes.rows?.[0]?.cost ?? 0)
  const rangeDays = Math.max(1, (new Date(toIso).getTime() - new Date(fromIso).getTime()) / (1000 * 60 * 60 * 24))
  const projectedCostUsd = rangeDays > 0 ? (rangeCost / rangeDays) * 30 : 0

  const exhaustedUsersCount = Number(exhaustedRes.rows?.[0]?.exhausted_users ?? 0)

  const result: AIUsageOverviewResult = {
    tokensToday,
    tokensThisMonth,
    projectedCostUsd,
    costThisMonthUsd,
    exhaustedUsersCount,
  }

  await redis.setex(cacheKey, 60, JSON.stringify(result))
  return result
}
