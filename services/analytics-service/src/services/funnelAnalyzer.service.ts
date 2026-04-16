import { sql } from 'drizzle-orm'

import type { DateRange } from '../lib/dateRange.js'
import { env } from '../config/env.js'
import { getReadReplica } from '../lib/readReplica.js'
import { getRedis } from '../lib/redis.js'

export interface FunnelStep {
  step: string
  label: string
  users: number
  conversionRate: number
  dropOffRate: number
  medianTimeFromSignupHours: number
}

export interface FunnelResult {
  cohortSize: number
  cohortPeriod: { from: string; to: string }
  steps: FunnelStep[]
  overallConversionRate: number
}

type StepId =
  | 'signed_up'
  | 'phase_1_started'
  | 'phase_1_complete'
  | 'phase_2_complete'
  | 'phase_3_complete'
  | 'phase_4_complete'
  | 'subscribed'

const STEP_ORDER: Array<{ id: StepId; label: string }> = [
  { id: 'signed_up', label: 'Signed Up' },
  { id: 'phase_1_started', label: 'Phase 1 Started' },
  { id: 'phase_1_complete', label: 'Phase 1 Complete' },
  { id: 'phase_2_complete', label: 'Phase 2 Complete' },
  { id: 'phase_3_complete', label: 'Phase 3 Complete' },
  { id: 'phase_4_complete', label: 'Phase 4 Complete' },
  { id: 'subscribed', label: 'Subscribed' },
]

function median(numbers: number[]): number {
  if (numbers.length === 0) return 0
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

export async function getFunnel(range: DateRange): Promise<FunnelResult> {
  const redis = getRedis()
  const cacheKey = `analytics:funnel:${range.cacheKey}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached) as FunnelResult

  const db = getReadReplica()
  const cohortRes = (await db.execute(sql`
    SELECT user_id::text AS user_id, MIN(created_at) AS signup_at
    FROM analytics.platform_events
    WHERE event_type = 'user.signed_up'
      AND created_at >= ${range.fromDate.toISOString()}
      AND created_at <= ${range.toDate.toISOString()}
      AND user_id IS NOT NULL
    GROUP BY user_id
    ORDER BY MIN(created_at) ASC
    LIMIT 10000
  `)) as unknown as { rows?: Array<{ user_id: string; signup_at: string }> }

  const cohort = cohortRes.rows ?? []
  const signupMap = new Map(cohort.map((r) => [r.user_id, new Date(r.signup_at)]))
  const cohortUserIds = cohort.map((r) => r.user_id)
  const cohortSize = cohortUserIds.length

  if (cohortSize === 0) {
    const steps = STEP_ORDER.map((s) => ({
      step: s.id,
      label: s.label,
      users: 0,
      conversionRate: 0,
      dropOffRate: 0,
      medianTimeFromSignupHours: 0,
    }))
    const empty: FunnelResult = {
      cohortSize: 0,
      cohortPeriod: { from: range.fromDate.toISOString(), to: range.toDate.toISOString() },
      steps,
      overallConversionRate: 0,
    }
    await redis.setex(cacheKey, env.FUNNEL_CACHE_TTL, JSON.stringify(empty))
    return empty
  }

  const eventsRes = (await db.execute(sql`
    SELECT user_id::text AS user_id, event_type, properties, created_at
    FROM analytics.platform_events
    WHERE user_id = ANY(${cohortUserIds})
      AND event_type IN ('project.phase.advanced', 'agent.ran', 'plan.upgraded')
    ORDER BY created_at ASC
  `)) as unknown as { rows?: Array<{ user_id: string; event_type: string; properties: Record<string, unknown>; created_at: string }> }

  const reachedAt: Record<StepId, Map<string, Date>> = {
    signed_up: new Map(cohort.map((r) => [r.user_id, new Date(r.signup_at)])),
    phase_1_started: new Map(),
    phase_1_complete: new Map(),
    phase_2_complete: new Map(),
    phase_3_complete: new Map(),
    phase_4_complete: new Map(),
    subscribed: new Map(),
  }

  for (const row of eventsRes.rows ?? []) {
    const userId = row.user_id
    const when = new Date(row.created_at)
    if (row.event_type === 'agent.ran') {
      if (!reachedAt.phase_1_started.has(userId)) reachedAt.phase_1_started.set(userId, when)
    }
    if (row.event_type === 'project.phase.advanced') {
      const fromPhase = Number(row.properties?.['fromPhase'] ?? 0)
      if (!reachedAt.phase_1_started.has(userId)) reachedAt.phase_1_started.set(userId, when)
      if (fromPhase === 1 && !reachedAt.phase_1_complete.has(userId)) reachedAt.phase_1_complete.set(userId, when)
      if (fromPhase === 2 && !reachedAt.phase_2_complete.has(userId)) reachedAt.phase_2_complete.set(userId, when)
      if (fromPhase === 3 && !reachedAt.phase_3_complete.has(userId)) reachedAt.phase_3_complete.set(userId, when)
      if (fromPhase === 4 && !reachedAt.phase_4_complete.has(userId)) reachedAt.phase_4_complete.set(userId, when)
    }
    if (row.event_type === 'plan.upgraded') {
      const fromPlan = String(row.properties?.['fromPlan'] ?? '')
      const toPlan = String(row.properties?.['toPlan'] ?? '')
      if ((fromPlan === 'free' || fromPlan === '') && toPlan !== 'free' && !reachedAt.subscribed.has(userId)) {
        reachedAt.subscribed.set(userId, when)
      }
    }
  }

  let prevRate = 100
  const steps: FunnelStep[] = STEP_ORDER.map((step) => {
    const users = reachedAt[step.id].size
    const conversionRate = cohortSize > 0 ? (users / cohortSize) * 100 : 0
    const dropOffRate = step.id === 'signed_up' ? 0 : Math.max(0, prevRate - conversionRate)
    prevRate = conversionRate
    const durations = Array.from(reachedAt[step.id].entries()).map(([userId, stepTime]) => {
      const signup = signupMap.get(userId)
      if (!signup) return 0
      return (stepTime.getTime() - signup.getTime()) / (1000 * 60 * 60)
    })
    return {
      step: step.id,
      label: step.label,
      users,
      conversionRate: Math.round(conversionRate * 100) / 100,
      dropOffRate: Math.round(dropOffRate * 100) / 100,
      medianTimeFromSignupHours: Math.round(median(durations) * 100) / 100,
    }
  })

  const overallConversionRate =
    cohortSize > 0 ? Math.round((reachedAt.subscribed.size / cohortSize) * 10000) / 100 : 0
  const result: FunnelResult = {
    cohortSize,
    cohortPeriod: { from: range.fromDate.toISOString(), to: range.toDate.toISOString() },
    steps,
    overallConversionRate,
  }
  await redis.setex(cacheKey, env.FUNNEL_CACHE_TTL, JSON.stringify(result))
  return result
}
