import { findSubscriptionByUserId } from '../db/queries/subscriptions.queries.js'
import {
  atomicIncrementUsage,
  currentMonthDateString,
  getCurrentMonthUsage,
  getOrCreateMonthlyUsage,
  updateTokenLimit as updateTokenLimitInDb,
} from '../db/queries/tokenUsage.queries.js'
import { env } from '../config/env.js'
import { publishTokenBudgetWarning } from '../events/publisher.js'
import { logger } from '../lib/logger.js'
import { getRedis } from '../lib/redis.js'

import type { TokenUsage } from '../db/schema.js'

function nextMonthResetIso(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0))
  return d.toISOString()
}

function secondsUntilEndOfMonth(now = new Date()): number {
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0))
  return Math.max(1, Math.floor((nextMonth.getTime() - now.getTime()) / 1000))
}

export type CreditState = 'active' | 'warning_80' | 'warning_95' | 'exhausted'

function computeCreditState(percentUsed: number): CreditState {
  if (percentUsed >= 100) return 'exhausted'
  if (percentUsed >= 95) return 'warning_95'
  if (percentUsed >= 80) return 'warning_80'
  return 'active'
}

export async function checkAndEmitBudgetWarnings(userId: string, usage: TokenUsage): Promise<void> {
  const sub = await findSubscriptionByUserId(userId)
  const planLimit = sub?.plan?.tokenLimitMonthly ?? Number(usage.tokensLimit)
  if (planLimit === -1) return

  const baseLimit = Number(usage.tokensLimit)
  const bonus = Number(usage.bonusTokens ?? 0n)
  const effectiveLimit = baseLimit + bonus
  if (effectiveLimit <= 0) return

  const used = Number(usage.tokensUsed)
  const pct = (used / effectiveLimit) * 100
  const month = currentMonthDateString()
  const redis = getRedis()

  for (const threshold of [env.TOKEN_WARNING_THRESHOLD_1, env.TOKEN_WARNING_THRESHOLD_2]) {
    const warningKey = `billing:warn:${threshold}:${userId}:${month}`
    const alreadySent = await redis.exists(warningKey)
    if (!alreadySent && pct >= threshold) {
      await publishTokenBudgetWarning({
        userId,
        percentUsed: threshold as 80 | 95,
        tokensUsed: used,
        tokenLimit: effectiveLimit,
      })
      await redis.setex(warningKey, secondsUntilEndOfMonth(), '1')
    }
  }
}

export async function incrementUsage(
  userId: string,
  data: { tokensUsed: number; costUsd: string },
): Promise<TokenUsage> {
  const month = currentMonthDateString()
  await getOrCreateMonthlyUsage(userId, month)
  const updated = await atomicIncrementUsage(userId, month, {
    tokensToAdd: BigInt(data.tokensUsed),
    costToAdd: parseFloat(data.costUsd),
  })
  void checkAndEmitBudgetWarnings(userId, updated).catch((error) =>
    logger.error('Budget warning emission failed', { userId, error }),
  )
  const redis = getRedis()
  await redis.del(`billing:budget:${userId}`)
  await redis.del(`billing:usage:${userId}`)
  return updated
}

export interface TokenBudgetView {
  tokensUsed: number
  tokensLimit: number
  tokensRemaining: number
  bonusTokens: number
  effectiveLimit: number
  effectiveRemaining: number
  percentUsed: number
  planTier: string
  currentMonth: string
  resetAt: string | null
  warningThresholds: Array<{ percent: number; triggered: boolean }>
  isUnlimited: boolean
  creditState: CreditState
  isOneTimeCredits: boolean
}

export async function getTokenBudget(userId: string): Promise<TokenBudgetView> {
  const redis = getRedis()
  const cacheKey = `billing:budget:${userId}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    try {
      return JSON.parse(cached) as TokenBudgetView
    } catch {
      // continue
    }
  }

  const month = currentMonthDateString()
  const usage = (await getCurrentMonthUsage(userId)) ?? (await getOrCreateMonthlyUsage(userId, month))
  const sub = await findSubscriptionByUserId(userId)
  const planTier = sub?.plan?.name ?? 'free'
  const planLimit = sub?.plan?.tokenLimitMonthly ?? Number(usage.tokensLimit)
  const isOneTime = sub?.isOneTimeCredits ?? planTier === 'free'

  const baseLimit = Number(usage.tokensLimit)
  const bonus = Number(usage.bonusTokens ?? 0n)

  let view: TokenBudgetView
  if (planLimit === -1) {
    view = {
      tokensUsed: Number(usage.tokensUsed),
      tokensLimit: -1,
      tokensRemaining: -1,
      bonusTokens: bonus,
      effectiveLimit: -1,
      effectiveRemaining: -1,
      percentUsed: 0,
      planTier,
      currentMonth: month.slice(0, 7),
      resetAt: nextMonthResetIso(),
      warningThresholds: [
        { percent: env.TOKEN_WARNING_THRESHOLD_1, triggered: false },
        { percent: env.TOKEN_WARNING_THRESHOLD_2, triggered: false },
      ],
      isUnlimited: true,
      creditState: 'active',
      isOneTimeCredits: false,
    }
  } else {
    const used = Number(usage.tokensUsed)
    const effectiveLimit = baseLimit + bonus
    const percentUsed =
      effectiveLimit > 0 ? Math.min(100, Math.round((used / effectiveLimit) * 10000) / 100) : 0
    const effectiveRemaining = Math.max(0, effectiveLimit - used)
    const legacyRemaining = Math.max(0, baseLimit - used)
    const creditState = computeCreditState(percentUsed)
    view = {
      tokensUsed: used,
      tokensLimit: baseLimit,
      tokensRemaining: legacyRemaining,
      bonusTokens: bonus,
      effectiveLimit,
      effectiveRemaining,
      percentUsed,
      planTier,
      currentMonth: month.slice(0, 7),
      resetAt: isOneTime ? null : nextMonthResetIso(),
      warningThresholds: [
        { percent: env.TOKEN_WARNING_THRESHOLD_1, triggered: percentUsed >= env.TOKEN_WARNING_THRESHOLD_1 },
        { percent: env.TOKEN_WARNING_THRESHOLD_2, triggered: percentUsed >= env.TOKEN_WARNING_THRESHOLD_2 },
      ],
      isUnlimited: false,
      creditState,
      isOneTimeCredits: isOneTime,
    }
  }

  await redis.setex(cacheKey, env.TOKEN_BUDGET_CACHE_TTL, JSON.stringify(view))
  return view
}

export async function updateTokenLimit(userId: string, tokensLimit: bigint): Promise<void> {
  await updateTokenLimitInDb(userId, tokensLimit)
  const r = getRedis()
  await r.del(`billing:budget:${userId}`)
  await r.del(`billing:subscription:${userId}`)
}
