import { describe, expect, it, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  execute: vi.fn(),
}))

vi.mock('../../src/lib/readReplica.js', () => ({
  getReadReplica: () => ({ execute: m.execute }),
}))
vi.mock('../../src/lib/db.js', () => ({
  getDb: vi.fn(),
}))

import { validateDateRange } from '../../src/lib/dateRange.js'
import { getKpis } from '../../src/services/kpiAggregator.service.js'

describe('kpiAggregator.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty time series when no events', async () => {
    m.execute
      .mockResolvedValueOnce({ rows: [{ mau: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
    const range = validateDateRange('2025-01-01', '2025-01-01', 'day')
    const res = await getKpis(range)
    expect(res.timeSeries).toEqual([])
    expect(res.summary.mau).toBe(0)
  })

  it('computes MAU as distinct user count', async () => {
    m.execute
      .mockResolvedValueOnce({ rows: [{ mau: 3 }] })
      .mockResolvedValueOnce({ rows: [{ day: '2025-01-01', dau: 2 }] })
      .mockResolvedValueOnce({ rows: [] })
    const range = validateDateRange('2025-01-01', '2025-01-01', 'day')
    const res = await getKpis(range)
    expect(res.summary.mau).toBe(3)
  })

  it('computes dauAverage correctly', async () => {
    m.execute
      .mockResolvedValueOnce({ rows: [{ mau: 2 }] })
      .mockResolvedValueOnce({ rows: [{ day: '2025-01-01', dau: 1 }, { day: '2025-01-02', dau: 3 }] })
      .mockResolvedValueOnce({ rows: [] })
    const range = validateDateRange('2025-01-01', '2025-01-02', 'day')
    const res = await getKpis(range)
    expect(res.summary.dauAverage).toBe(2)
  })

  it('avgAgentRunsPerUser guards divide-by-zero', async () => {
    m.execute
      .mockResolvedValueOnce({ rows: [{ mau: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ period: '2025-01-01', event_type: 'agent.ran', count: 10 }] })
    const range = validateDateRange('2025-01-01', '2025-01-01', 'day')
    const res = await getKpis(range)
    expect(res.summary.avgAgentRunsPerUser).toBe(0)
  })

  it('uses readReplica execute for KPI queries', async () => {
    m.execute
      .mockResolvedValueOnce({ rows: [{ mau: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
    const range = validateDateRange('2025-01-01', '2025-01-01', 'day')
    await getKpis(range)
    expect(m.execute).toHaveBeenCalledTimes(3)
  })

  it('date range validation: from > to', () => {
    expect(() => validateDateRange('2025-01-10', '2025-01-01')).toThrowError()
  })

  it('date range validation: range > max', () => {
    expect(() => validateDateRange('2025-01-01', '2027-01-01')).toThrowError()
  })

  it('date range validation: invalid date', () => {
    expect(() => validateDateRange('bad', '2025-01-01')).toThrowError()
  })
})
