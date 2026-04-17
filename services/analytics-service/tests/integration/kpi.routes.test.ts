import { randomUUID } from 'node:crypto'

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { signTestAccessToken } from '../jwt.js'

const m = vi.hoisted(() => ({
  getKpis: vi.fn(),
  queryAuditLogs: vi.fn(),
  getMyUsage: vi.fn(),
}))

vi.mock('../../src/services/kpiAggregator.service.js', () => ({
  getKpis: m.getKpis,
}))
vi.mock('../../src/services/auditLog.service.js', () => ({
  queryAuditLogs: m.queryAuditLogs,
  writeAuditEntry: vi.fn(),
}))
vi.mock('../../src/services/userActivity.service.js', () => ({
  getMyUsage: m.getMyUsage,
  getUserTimeline: vi.fn().mockResolvedValue({ events: [], summary: {} }),
}))
vi.mock('../../src/db/queries/platformEvents.queries.js', () => ({
  insertEvent: vi.fn(),
  insertEventsBatch: vi.fn(),
  getTimeSeriesEvents: vi.fn(),
  getUniqueDailyUsers: vi.fn(),
  getUserFunnelCohort: vi.fn(),
  getEventCountsByType: vi.fn(),
  getUserEventTimeline: vi.fn(),
}))
vi.mock('../../src/services/funnelAnalyzer.service.js', () => ({
  getFunnel: vi.fn().mockResolvedValue({ cohortSize: 0, steps: [] }),
}))
vi.mock('../../src/services/tokenUsageAnalytics.service.js', () => ({
  getTokenUsageAnalytics: vi.fn().mockResolvedValue({}),
}))
vi.mock('../../src/services/agentPerformance.service.js', () => ({
  getAgentPerformance: vi.fn().mockResolvedValue({ agents: [], totalRuns: 0, overallSuccessRate: 0 }),
}))

import { createApp } from '../../src/app.js'

describe('kpi.routes + admin guards', () => {
  let userToken: string
  let adminToken: string
  let superAdminToken: string

  beforeAll(async () => {
    userToken = await signTestAccessToken({ userId: randomUUID(), role: 'user' })
    adminToken = await signTestAccessToken({ userId: randomUUID(), role: 'admin' })
    superAdminToken = await signTestAccessToken({ userId: randomUUID(), role: 'super_admin' })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    m.getKpis.mockResolvedValue({
      summary: { mau: 2, dauAverage: 2, newSignups: 2, totalProjects: 1, totalAgentRuns: 3, avgAgentRunsPerUser: 1.5, phasesCompleted: 1 },
      timeSeries: [{ date: '2025-01-01', dau: 2, newSignups: 2, projectsCreated: 1, agentRuns: 3, phaseCompletions: 1 }],
    })
    m.queryAuditLogs.mockResolvedValue({ data: [], total: 0 })
    m.getMyUsage.mockResolvedValue({ tokensUsedThisMonth: 1234 })
  })

  it('GET /analytics/admin/kpis non-admin -> 403', async () => {
    const res = await createApp().request('http://localhost/analytics/admin/kpis?from=2025-01-01&to=2025-01-02&granularity=day', {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(res.status).toBe(403)
  })

  it('GET /analytics/admin/kpis admin valid -> 200', async () => {
    const res = await createApp().request('http://localhost/analytics/admin/kpis?from=2025-01-01&to=2025-01-02&granularity=day', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { timeSeries: unknown[] } }
    expect(Array.isArray(json.data.timeSeries)).toBe(true)
  })

  it('GET /analytics/admin/kpis from > to -> 422', async () => {
    const res = await createApp().request('http://localhost/analytics/admin/kpis?from=2025-01-10&to=2025-01-02&granularity=day', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.status).toBe(422)
  })

  it('GET /analytics/admin/kpis cached after first call', async () => {
    const app = createApp()
    await app.request('http://localhost/analytics/admin/kpis?from=2025-01-01&to=2025-01-02&granularity=day', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    await app.request('http://localhost/analytics/admin/kpis?from=2025-01-01&to=2025-01-02&granularity=day', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(m.getKpis).toHaveBeenCalledTimes(1)
  })

  it('GET /analytics/admin/kpis returns correct seeded DAU from mocked data', async () => {
    const res = await createApp().request('http://localhost/analytics/admin/kpis?from=2025-01-01&to=2025-01-01&granularity=day', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const json = (await res.json()) as { data: { timeSeries: Array<{ dau: number }> } }
    expect(json.data.timeSeries[0]?.dau).toBe(2)
  })

  it('GET /analytics/admin/audit-logs non-super-admin -> 403 AUDIT_LOG_RESTRICTED', async () => {
    const res = await createApp().request('http://localhost/analytics/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('AUDIT_LOG_RESTRICTED')
  })

  it('GET /analytics/admin/audit-logs super-admin -> 200', async () => {
    const res = await createApp().request('http://localhost/analytics/admin/audit-logs', {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })
    expect(res.status).toBe(200)
  })

  it('GET /analytics/me/usage valid user -> 200', async () => {
    const res = await createApp().request('http://localhost/analytics/me/usage', {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(res.status).toBe(200)
  })
})
