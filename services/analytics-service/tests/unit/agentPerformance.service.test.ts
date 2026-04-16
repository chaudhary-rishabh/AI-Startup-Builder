import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  execute: vi.fn(),
}))

vi.mock('../../src/lib/readReplica.js', () => ({
  getReadReplica: () => ({ execute: m.execute }),
}))

import { validateDateRange } from '../../src/lib/dateRange.js'
import { getAgentPerformance } from '../../src/services/agentPerformance.service.js'

describe('agentPerformance.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('computes successRate correctly', async () => {
    m.execute
      .mockResolvedValueOnce({
        rows: [
          {
            agent_type: 'prd_generator',
            total_runs: 10,
            success_runs: 8,
            failed_runs: 2,
            avg_duration_ms: 1000,
            p50_duration_ms: 900,
            p95_duration_ms: 1500,
            avg_tokens: 6000,
            avg_cost_usd: 0.09,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
    const res = await getAgentPerformance(validateDateRange('2025-01-01', '2025-01-10'))
    expect(res.agents[0]?.successRate).toBe(80)
  })

  it('includes percentile fields from query', async () => {
    m.execute
      .mockResolvedValueOnce({
        rows: [
          {
            agent_type: 'prd_generator',
            total_runs: 10,
            success_runs: 8,
            failed_runs: 2,
            avg_duration_ms: 1000,
            p50_duration_ms: 900,
            p95_duration_ms: 1500,
            avg_tokens: 6000,
            avg_cost_usd: 0.09,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
    const res = await getAgentPerformance(validateDateRange('2025-01-01', '2025-01-10'))
    expect(res.agents[0]?.p50DurationMs).toBe(900)
    expect(res.agents[0]?.p95DurationMs).toBe(1500)
  })

  it('returns agents sorted by total_runs desc', async () => {
    m.execute
      .mockResolvedValueOnce({
        rows: [
          {
            agent_type: 'b',
            total_runs: 20,
            success_runs: 15,
            failed_runs: 5,
            avg_duration_ms: 1000,
            p50_duration_ms: 900,
            p95_duration_ms: 1500,
            avg_tokens: 6000,
            avg_cost_usd: 0.09,
          },
          {
            agent_type: 'a',
            total_runs: 10,
            success_runs: 8,
            failed_runs: 2,
            avg_duration_ms: 1000,
            p50_duration_ms: 900,
            p95_duration_ms: 1500,
            avg_tokens: 6000,
            avg_cost_usd: 0.09,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
    const res = await getAgentPerformance(validateDateRange('2025-01-01', '2025-01-10'))
    expect(res.agents[0]?.agentType).toBe('b')
  })
})
