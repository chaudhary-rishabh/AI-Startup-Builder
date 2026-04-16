import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  execute: vi.fn(),
}))

vi.mock('../../src/lib/readReplica.js', () => ({
  getReadReplica: () => ({ execute: m.execute }),
}))

import { validateDateRange } from '../../src/lib/dateRange.js'
import { getFunnel } from '../../src/services/funnelAnalyzer.service.js'

describe('funnelAnalyzer.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cohortSize=0 returns all steps with 0 users', async () => {
    m.execute.mockResolvedValueOnce({ rows: [] })
    const res = await getFunnel(validateDateRange('2025-01-01', '2025-01-01'))
    expect(res.cohortSize).toBe(0)
    expect(res.steps.every((s) => s.users === 0)).toBe(true)
  })

  it('counts users at phase_4_complete', async () => {
    m.execute
      .mockResolvedValueOnce({
        rows: [{ user_id: 'u1', signup_at: '2025-01-01T00:00:00.000Z' }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: 'u1',
            event_type: 'project.phase.advanced',
            properties: { fromPhase: 4 },
            created_at: '2025-01-02T00:00:00.000Z',
          },
        ],
      })
    const res = await getFunnel(validateDateRange('2025-01-01', '2025-01-10'))
    const step = res.steps.find((s) => s.step === 'phase_4_complete')
    expect(step?.users).toBe(1)
  })

  it('conversion rates decrease monotonically', async () => {
    m.execute
      .mockResolvedValueOnce({
        rows: [
          { user_id: 'u1', signup_at: '2025-01-01T00:00:00.000Z' },
          { user_id: 'u2', signup_at: '2025-01-01T00:00:00.000Z' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { user_id: 'u1', event_type: 'agent.ran', properties: {}, created_at: '2025-01-01T01:00:00.000Z' },
        ],
      })
    const res = await getFunnel(validateDateRange('2025-01-01', '2025-01-10'))
    const rates = res.steps.map((s) => s.conversionRate)
    for (let i = 1; i < rates.length; i += 1) {
      expect(rates[i]).toBeLessThanOrEqual(rates[i - 1]!)
    }
  })

  it('dropOffRate = prev - curr', async () => {
    m.execute
      .mockResolvedValueOnce({
        rows: [
          { user_id: 'u1', signup_at: '2025-01-01T00:00:00.000Z' },
          { user_id: 'u2', signup_at: '2025-01-01T00:00:00.000Z' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { user_id: 'u1', event_type: 'agent.ran', properties: {}, created_at: '2025-01-01T01:00:00.000Z' },
        ],
      })
    const res = await getFunnel(validateDateRange('2025-01-01', '2025-01-10'))
    expect(res.steps[1]!.dropOffRate).toBe(50)
  })

  it('overallConversionRate = subscribed/cohort*100', async () => {
    m.execute
      .mockResolvedValueOnce({
        rows: [
          { user_id: 'u1', signup_at: '2025-01-01T00:00:00.000Z' },
          { user_id: 'u2', signup_at: '2025-01-01T00:00:00.000Z' },
          { user_id: 'u3', signup_at: '2025-01-01T00:00:00.000Z' },
          { user_id: 'u4', signup_at: '2025-01-01T00:00:00.000Z' },
          { user_id: 'u5', signup_at: '2025-01-01T00:00:00.000Z' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: 'u1',
            event_type: 'plan.upgraded',
            properties: { fromPlan: 'free', toPlan: 'pro' },
            created_at: '2025-01-03T00:00:00.000Z',
          },
        ],
      })
    const res = await getFunnel(validateDateRange('2025-01-01', '2025-01-10'))
    expect(res.overallConversionRate).toBe(20)
  })

  it('medianTimeFromSignupHours computed', async () => {
    m.execute
      .mockResolvedValueOnce({
        rows: [
          { user_id: 'u1', signup_at: '2025-01-01T00:00:00.000Z' },
          { user_id: 'u2', signup_at: '2025-01-01T00:00:00.000Z' },
          { user_id: 'u3', signup_at: '2025-01-01T00:00:00.000Z' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { user_id: 'u1', event_type: 'agent.ran', properties: {}, created_at: '2025-01-01T01:00:00.000Z' },
          { user_id: 'u2', event_type: 'agent.ran', properties: {}, created_at: '2025-01-01T02:00:00.000Z' },
          { user_id: 'u3', event_type: 'agent.ran', properties: {}, created_at: '2025-01-01T03:00:00.000Z' },
        ],
      })
    const res = await getFunnel(validateDateRange('2025-01-01', '2025-01-10'))
    const step = res.steps.find((s) => s.step === 'phase_1_started')
    expect(step?.medianTimeFromSignupHours).toBe(2)
  })
})
