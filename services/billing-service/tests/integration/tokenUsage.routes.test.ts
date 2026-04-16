import { randomUUID } from 'node:crypto'

import { beforeAll, describe, expect, it, vi } from 'vitest'

import { createApp } from '../../src/app.js'
import { signTestAccessToken } from '../jwt.js'

const m = vi.hoisted(() => ({
  getTokenBudget: vi.fn(),
}))

vi.mock('../../src/services/tokenUsage.service.js', () => ({
  getTokenBudget: m.getTokenBudget,
  incrementUsage: vi.fn(),
}))

describe('tokenUsage.routes (integration-style)', () => {
  let token: string
  beforeAll(async () => {
    token = await signTestAccessToken({ userId: randomUUID(), plan: 'pro' })
  })

  it('GET /billing/token-usage returns usage shape', async () => {
    m.getTokenBudget.mockResolvedValueOnce({
      tokensUsed: 1200,
      tokensLimit: 50000,
      tokensRemaining: 48800,
      percentUsed: 2.4,
      planTier: 'pro',
      currentMonth: '2026-04',
      resetAt: '2026-05-01T00:00:00.000Z',
      warningThresholds: [],
      isUnlimited: false,
    })
    const app = createApp()
    const res = await app.request('http://localhost/billing/token-usage', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const j = (await res.json()) as { data: { tokensUsed: number } }
    expect(j.data.tokensUsed).toBe(1200)
  })
})
