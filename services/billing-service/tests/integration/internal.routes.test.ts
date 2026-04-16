import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../../src/app.js'

const m = vi.hoisted(() => ({
  checkTokenBudget: vi.fn(),
  incrementUsage: vi.fn(),
}))

vi.mock('../../src/services/planEnforcement.service.js', () => ({
  checkTokenBudget: m.checkTokenBudget,
}))
vi.mock('../../src/services/tokenUsage.service.js', () => ({
  incrementUsage: m.incrementUsage,
  getTokenBudget: vi.fn(),
}))

describe('internal.routes (integration-style)', () => {
  it('GET /internal/token-budget without header returns 403', async () => {
    const app = createApp()
    const res = await app.request(
      'http://localhost/internal/token-budget?userId=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee&estimatedTokens=100',
    )
    expect(res.status).toBe(403)
  })

  it('GET /internal/token-budget with header returns budget result', async () => {
    m.checkTokenBudget.mockResolvedValueOnce({
      allowed: true,
      remaining: 10000,
      limit: 50000,
      percentUsed: 20,
    })
    const app = createApp()
    const res = await app.request(
      'http://localhost/internal/token-budget?userId=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee&estimatedTokens=100',
      {
        headers: { 'X-Internal-Service': 'ai-service' },
      },
    )
    expect(res.status).toBe(200)
    const j = (await res.json()) as { data: { allowed: boolean } }
    expect(j.data.allowed).toBe(true)
  })

  it('GET /internal/token-budget fail-open when service throws', async () => {
    m.checkTokenBudget.mockRejectedValueOnce(new Error('db down'))
    const app = createApp()
    const res = await app.request(
      'http://localhost/internal/token-budget?userId=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee&estimatedTokens=100',
      {
        headers: { 'X-Internal-Service': 'ai-service' },
      },
    )
    expect(res.status).toBe(200)
    const j = (await res.json()) as { data: { allowed: boolean } }
    expect(j.data.allowed).toBe(true)
  })

  it('POST /internal/token-usage/increment returns updated=true and false on failure', async () => {
    m.incrementUsage.mockResolvedValueOnce({})
    const app = createApp()
    const okRes = await app.request('http://localhost/internal/token-usage/increment', {
      method: 'POST',
      headers: { 'X-Internal-Service': 'ai-service', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        tokensUsed: 100,
        costUsd: '0.10',
      }),
    })
    expect(okRes.status).toBe(200)
    const j1 = (await okRes.json()) as { data: { updated: boolean } }
    expect(j1.data.updated).toBe(true)

    m.incrementUsage.mockRejectedValueOnce(new Error('db fail'))
    const failRes = await app.request('http://localhost/internal/token-usage/increment', {
      method: 'POST',
      headers: { 'X-Internal-Service': 'ai-service', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        tokensUsed: 100,
        costUsd: '0.10',
      }),
    })
    const j2 = (await failRes.json()) as { data: { updated: boolean } }
    expect(j2.data.updated).toBe(false)
  })
})
