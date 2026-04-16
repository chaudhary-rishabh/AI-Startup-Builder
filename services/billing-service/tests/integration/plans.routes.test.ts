import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../../src/app.js'

const m = vi.hoisted(() => ({
  findAllActivePlans: vi.fn(),
}))

vi.mock('../../src/db/queries/plans.queries.js', () => ({
  findAllActivePlans: m.findAllActivePlans,
}))

describe('plans.routes (integration-style)', () => {
  it('GET /billing/plans returns 4 plans and caches', async () => {
    m.findAllActivePlans.mockResolvedValueOnce([
      { id: '1', name: 'free', displayName: 'Free', priceMonthlyCents: 0, priceYearlyCents: 0, tokenLimitMonthly: 50000, projectLimit: 3, apiKeyLimit: 2, features: [], sortOrder: 1 },
      { id: '2', name: 'pro', displayName: 'Pro', priceMonthlyCents: 2900, priceYearlyCents: 29000, tokenLimitMonthly: 500000, projectLimit: 20, apiKeyLimit: 10, features: [], sortOrder: 2 },
      { id: '3', name: 'team', displayName: 'Team', priceMonthlyCents: 9900, priceYearlyCents: 99000, tokenLimitMonthly: 2000000, projectLimit: -1, apiKeyLimit: -1, features: [], sortOrder: 3 },
      { id: '4', name: 'enterprise', displayName: 'Enterprise', priceMonthlyCents: 0, priceYearlyCents: 0, tokenLimitMonthly: -1, projectLimit: -1, apiKeyLimit: -1, features: [], sortOrder: 4 },
    ])
    const app = createApp()
    const r1 = await app.request('http://localhost/billing/plans')
    expect(r1.status).toBe(200)
    const j1 = (await r1.json()) as { data: { plans: Array<{ name: string }> } }
    expect(j1.data.plans).toHaveLength(4)
    expect(j1.data.plans[0]?.name).toBe('free')

    const r2 = await app.request('http://localhost/billing/plans')
    expect(r2.status).toBe(200)
    expect(m.findAllActivePlans).toHaveBeenCalledTimes(1)
  })
})
