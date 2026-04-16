import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  checkAndEmitBudgetWarnings,
  getTokenBudget,
  incrementUsage,
} from '../../src/services/tokenUsage.service.js'

const m = vi.hoisted(() => ({
  getOrCreateMonthlyUsage: vi.fn(),
  atomicIncrementUsage: vi.fn(),
  getCurrentMonthUsage: vi.fn(),
  findSubscriptionByUserId: vi.fn(),
  publishTokenBudgetWarning: vi.fn(),
}))

vi.mock('../../src/db/queries/tokenUsage.queries.js', () => ({
  currentMonthDateString: () => '2026-04-01',
  getOrCreateMonthlyUsage: m.getOrCreateMonthlyUsage,
  atomicIncrementUsage: m.atomicIncrementUsage,
  getCurrentMonthUsage: m.getCurrentMonthUsage,
}))
vi.mock('../../src/db/queries/subscriptions.queries.js', () => ({
  findSubscriptionByUserId: m.findSubscriptionByUserId,
}))
vi.mock('../../src/events/publisher.js', () => ({
  publishTokenBudgetWarning: m.publishTokenBudgetWarning,
}))

describe('tokenUsage.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.getOrCreateMonthlyUsage.mockResolvedValue({
      userId: 'u',
      month: '2026-04-01',
      tokensUsed: BigInt(0),
      tokensLimit: BigInt(50000),
      costUsd: '0.0000',
      updatedAt: new Date(),
    })
    m.atomicIncrementUsage.mockResolvedValue({
      userId: 'u',
      month: '2026-04-01',
      tokensUsed: BigInt(40000),
      tokensLimit: BigInt(50000),
      costUsd: '12.0000',
      updatedAt: new Date(),
    })
    m.getCurrentMonthUsage.mockResolvedValue(undefined)
    m.findSubscriptionByUserId.mockResolvedValue({
      plan: { name: 'pro', tokenLimitMonthly: 50000 },
    })
  })

  it('incrementUsage creates row then increments', async () => {
    const out = await incrementUsage('u', { tokensUsed: 1000, costUsd: '0.25' })
    expect(m.getOrCreateMonthlyUsage).toHaveBeenCalled()
    expect(m.atomicIncrementUsage).toHaveBeenCalled()
    expect(out.tokensUsed).toBe(BigInt(40000))
  })

  it('getTokenBudget returns unlimited=true for enterprise', async () => {
    m.getCurrentMonthUsage.mockResolvedValueOnce({
      tokensUsed: BigInt(1000),
      tokensLimit: BigInt(-1),
    })
    m.findSubscriptionByUserId.mockResolvedValueOnce({
      plan: { name: 'enterprise', tokenLimitMonthly: -1 },
    })
    const budget = await getTokenBudget('u')
    expect(budget.isUnlimited).toBe(true)
    expect(budget.tokensRemaining).toBe(-1)
  })

  it('getTokenBudget computes percent and remaining', async () => {
    m.getCurrentMonthUsage.mockResolvedValueOnce({
      tokensUsed: BigInt(25000),
      tokensLimit: BigInt(50000),
    })
    const budget = await getTokenBudget('u')
    expect(budget.percentUsed).toBeGreaterThan(49)
    expect(budget.tokensRemaining).toBe(25000)
  })

  it('checkAndEmitBudgetWarnings emits at 80 and 95 once', async () => {
    await checkAndEmitBudgetWarnings('u', {
      userId: 'u',
      month: '2026-04-01',
      tokensUsed: BigInt(49000),
      tokensLimit: BigInt(50000),
      costUsd: '1.0',
      updatedAt: new Date(),
      id: 'x',
    })
    expect(m.publishTokenBudgetWarning).toHaveBeenCalled()
  })

  it('checkAndEmitBudgetWarnings skips unlimited', async () => {
    await checkAndEmitBudgetWarnings('u', {
      userId: 'u',
      month: '2026-04-01',
      tokensUsed: BigInt(999999),
      tokensLimit: BigInt(-1),
      costUsd: '1.0',
      updatedAt: new Date(),
      id: 'x',
    })
    expect(m.publishTokenBudgetWarning).not.toHaveBeenCalled()
  })
})
