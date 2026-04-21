import { describe, expect, it, vi } from 'vitest'

import { checkTokenBudget } from '../../src/services/planEnforcement.service.js'

const m = vi.hoisted(() => ({
  getTokenBudget: vi.fn(),
}))

vi.mock('../../src/services/tokenUsage.service.js', () => ({
  getTokenBudget: m.getTokenBudget,
}))

const baseBudget = {
  tokensUsed: 0,
  tokensLimit: 10000,
  tokensRemaining: 5000,
  bonusTokens: 0,
  effectiveLimit: 10000,
  effectiveRemaining: 5000,
  percentUsed: 50,
  planTier: 'free',
  currentMonth: '2026-04',
  resetAt: null,
  warningThresholds: [],
  isUnlimited: false,
  creditState: 'active' as const,
  isOneTimeCredits: true,
}

describe('planEnforcement.service', () => {
  it('allowed=true when remaining > estimated', async () => {
    m.getTokenBudget.mockResolvedValueOnce({
      ...baseBudget,
      tokensRemaining: 5000,
      effectiveRemaining: 5000,
      percentUsed: 50,
    })
    const out = await checkTokenBudget('u', 1000)
    expect(out.allowed).toBe(true)
  })

  it('allowed=false when remaining < estimated', async () => {
    m.getTokenBudget.mockResolvedValueOnce({
      ...baseBudget,
      tokensRemaining: 100,
      effectiveRemaining: 100,
      percentUsed: 99,
    })
    const out = await checkTokenBudget('u', 1000)
    expect(out.allowed).toBe(false)
  })

  it('allowed=true when unlimited plan', async () => {
    m.getTokenBudget.mockResolvedValueOnce({
      ...baseBudget,
      isUnlimited: true,
      tokensRemaining: -1,
      tokensLimit: -1,
      effectiveLimit: -1,
      effectiveRemaining: -1,
      percentUsed: 0,
    })
    const out = await checkTokenBudget('u', 1000)
    expect(out.allowed).toBe(true)
    expect(out.limit).toBe(-1)
  })

  it('fails open when dependency throws', async () => {
    m.getTokenBudget.mockRejectedValueOnce(new Error('db down'))
    const out = await checkTokenBudget('u', 1000)
    expect(out.allowed).toBe(true)
    expect(out.remaining).toBe(999999)
  })
})
