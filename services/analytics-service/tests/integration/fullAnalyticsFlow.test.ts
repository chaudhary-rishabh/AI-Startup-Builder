import { randomUUID } from 'node:crypto'

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { signTestAccessToken } from '../jwt.js'

const store = vi.hoisted(() => ({
  events: [] as Array<{
    userId: string | null
    projectId: string | null
    eventType: string
    properties: Record<string, unknown>
    sessionId: string | null
    createdAt: Date
  }>,
  auditLogs: [] as Array<Record<string, unknown>>,
  tokenUsageByUser: new Map<string, number>(),
}))

vi.mock('../../src/db/queries/platformEvents.queries.js', () => ({
  insertEvent: vi.fn(async (event: any) => {
    store.events.push({
      userId: event.userId ?? null,
      projectId: event.projectId ?? null,
      eventType: event.eventType,
      properties: event.properties ?? {},
      sessionId: event.sessionId ?? null,
      createdAt: event.createdAt ?? new Date(),
    })
  }),
  insertEventsBatch: vi.fn(async (events: any[]) => {
    for (const event of events) {
      store.events.push({
        userId: event.userId ?? null,
        projectId: event.projectId ?? null,
        eventType: event.eventType,
        properties: event.properties ?? {},
        sessionId: event.sessionId ?? null,
        createdAt: event.createdAt ?? new Date(),
      })
    }
  }),
  getUserEventTimeline: vi.fn(async (userId: string) =>
    store.events
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 100),
  ),
  getTimeSeriesEvents: vi.fn(),
  getUniqueDailyUsers: vi.fn(),
  getUserFunnelCohort: vi.fn(),
  getEventCountsByType: vi.fn(),
}))

import type { DateRange } from '../../src/lib/dateRange.js'
vi.mock('../../src/services/kpiAggregator.service.js', async () => {
  const actual = await vi.importActual('../../src/services/kpiAggregator.service.js')
  return {
    ...actual,
    getKpis: vi.fn(async (_range: DateRange) => {
      const signedUps = store.events.filter((e) => e.eventType === 'user.signed_up').length
      const agentRuns = store.events.filter((e) => e.eventType === 'agent.run.completed').length
      return {
        summary: {
          mau: new Set(store.events.map((e) => e.userId).filter(Boolean)).size,
          dauAverage: signedUps > 0 ? signedUps : 0,
          newSignups: signedUps,
          totalProjects: store.events.filter((e) => e.eventType === 'project.created').length,
          totalAgentRuns: agentRuns,
          avgAgentRunsPerUser: 0,
          phasesCompleted: store.events.filter((e) => e.eventType === 'project.phase.advanced').length,
        },
        timeSeries: [
          {
            date: '2025-01-01',
            dau: signedUps,
            newSignups: signedUps,
            projectsCreated: 0,
            agentRuns,
            phaseCompletions: store.events.filter((e) => e.eventType === 'project.phase.advanced').length,
          },
        ],
      }
    }),
  }
})
vi.mock('../../src/services/funnelAnalyzer.service.js', () => ({
  getFunnel: vi.fn(async () => ({
    cohortSize: 5,
    cohortPeriod: { from: '2025-01-01', to: '2025-01-31' },
    steps: [
      { step: 'signed_up', users: 5, conversionRate: 100, dropOffRate: 0, medianTimeFromSignupHours: 0 },
      { step: 'phase_1_started', users: 4, conversionRate: 80, dropOffRate: 20, medianTimeFromSignupHours: 1 },
      { step: 'phase_1_complete', users: 3, conversionRate: 60, dropOffRate: 20, medianTimeFromSignupHours: 2 },
      { step: 'phase_2_complete', users: 2, conversionRate: 40, dropOffRate: 20, medianTimeFromSignupHours: 3 },
      { step: 'phase_3_complete', users: 2, conversionRate: 40, dropOffRate: 0, medianTimeFromSignupHours: 4 },
      { step: 'phase_4_complete', users: 1, conversionRate: 20, dropOffRate: 20, medianTimeFromSignupHours: 5 },
      { step: 'subscribed', users: 1, conversionRate: 20, dropOffRate: 0, medianTimeFromSignupHours: 6 },
    ],
    overallConversionRate: 20,
  })),
}))
vi.mock('../../src/services/agentPerformance.service.js', () => ({
  getAgentPerformance: vi.fn(async () => ({
    agents: [
      {
        agentType: 'prd_generator',
        totalRuns: 100,
        successRuns: 95,
        failedRuns: 5,
        successRate: 95,
        avgDurationMs: 12000,
        p50DurationMs: 11000,
        p95DurationMs: 21000,
        avgTokensPerRun: 6000,
        avgCostUsd: 0.09,
        errorBreakdown: { timeout: 5 },
      },
    ],
    totalRuns: 100,
    overallSuccessRate: 95,
  })),
}))
vi.mock('../../src/services/tokenUsageAnalytics.service.js', () => ({
  getTokenUsageAnalytics: vi.fn(async () => ({})),
}))
vi.mock('../../src/services/userActivity.service.js', () => ({
  getMyUsage: vi.fn(async (userId: string) => ({
    projectCount: 2,
    activeProjectCount: 2,
    archivedProjectCount: 0,
    tokensUsedAllTime: store.tokenUsageByUser.get(userId) ?? 0,
    tokensUsedThisMonth: store.tokenUsageByUser.get(userId) ?? 0,
    agentRunsTotal: store.events.filter((e) => e.userId === userId && e.eventType === 'agent.run.completed').length,
    agentRunsThisMonth: store.events.filter((e) => e.userId === userId && e.eventType === 'agent.run.completed').length,
    phasesCompleted: store.events.filter((e) => e.userId === userId && e.eventType === 'project.phase.advanced').length,
    averageAgentRunMs: 18500,
    mostUsedAgent: 'prd_generator',
    lastActiveAt: new Date().toISOString(),
    accountCreatedAt: new Date().toISOString(),
    daysSinceSignup: 10,
  })),
  getUserTimeline: vi.fn(async (userId: string) => ({
    events: store.events.filter((e) => e.userId === userId),
    summary: { totalEvents: store.events.filter((e) => e.userId === userId).length },
  })),
}))
vi.mock('../../src/services/auditLog.service.js', () => ({
  writeAuditEntry: vi.fn(async (entry: Record<string, unknown>) => {
    const row = { id: randomUUID(), createdAt: new Date().toISOString(), ...entry }
    store.auditLogs.push(row)
    return row
  }),
  queryAuditLogs: vi.fn(async () => ({
    data: store.auditLogs,
    total: store.auditLogs.length,
  })),
}))

import { processIncomingEvent } from '../../src/events/consumer.js'
import { createApp } from '../../src/app.js'
import { writeAuditEntry } from '../../src/services/auditLog.service.js'

describe('full analytics flow', () => {
  let adminToken: string
  let superAdminToken: string
  let userToken: string
  const userId = randomUUID()

  beforeAll(async () => {
    adminToken = await signTestAccessToken({ userId: randomUUID(), role: 'admin' })
    superAdminToken = await signTestAccessToken({ userId: randomUUID(), role: 'super_admin' })
    userToken = await signTestAccessToken({ userId, role: 'user' })
  })

  beforeEach(() => {
    store.events.length = 0
    store.auditLogs.length = 0
    store.tokenUsageByUser.clear()
  })

  it('1) agent.run.completed event recorded correctly', async () => {
    await processIncomingEvent('agent.run.completed', {
      userId,
      projectId: randomUUID(),
      agentType: 'prd_generator',
      model: 'claude-opus-4-5',
      tokensUsed: 6000,
      costUsd: '0.090000',
      durationMs: 18500,
      status: 'completed',
      phase: 2,
    })
    const row = store.events.find((e) => e.eventType === 'agent.run.completed')
    expect(row).toBeTruthy()
    expect(row?.properties['agentType']).toBe('prd_generator')
  })

  it('2) user.registered recorded as user.signed_up', async () => {
    await processIncomingEvent('user.registered', { userId, email: 'u@test.local', name: 'U' })
    expect(store.events.some((e) => e.eventType === 'user.signed_up')).toBe(true)
  })

  it('3) subscription.upgraded recorded as plan.upgraded', async () => {
    await processIncomingEvent('subscription.upgraded', { userId, oldPlan: 'free', newPlan: 'pro' })
    const row = store.events.find((e) => e.eventType === 'plan.upgraded')
    expect(row?.properties['fromPlan']).toBe('free')
    expect(row?.properties['toPlan']).toBe('pro')
  })

  it('4) KPI aggregation returns seeded events', async () => {
    for (let i = 0; i < 10; i += 1) {
      await processIncomingEvent('user.registered', { userId: randomUUID() })
    }
    const res = await createApp().request('http://localhost/analytics/admin/kpis?from=2025-01-01&to=2025-01-01&granularity=day', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const body = (await res.json()) as { data: { timeSeries: Array<{ newSignups: number }> } }
    expect(body.data.timeSeries[0]?.newSignups).toBe(10)
  })

  it('5) Funnel identifies cohort conversion', async () => {
    const res = await createApp().request('http://localhost/analytics/admin/funnel?from=2025-01-01&to=2025-01-31', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const body = (await res.json()) as { data: { cohortSize: number; steps: Array<{ users: number }>; overallConversionRate: number } }
    expect(body.data.cohortSize).toBe(5)
    expect(body.data.steps[2]?.users).toBe(3)
    expect(body.data.steps[6]?.users).toBe(1)
    expect(body.data.overallConversionRate).toBe(20)
  })

  it('6) Agent performance percentiles present', async () => {
    const res = await createApp().request('http://localhost/analytics/admin/agent-performance?from=2025-01-01&to=2025-01-31&granularity=day', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const body = (await res.json()) as { data: { agents: Array<{ p50DurationMs: number }> } }
    expect(body.data.agents[0]?.p50DurationMs).toBeGreaterThan(0)
  })

  it('7) Audit log append-only path works', async () => {
    await writeAuditEntry({
      adminId: randomUUID(),
      action: 'user.suspended',
      targetType: 'user',
    })
    const res = await createApp().request('http://localhost/analytics/admin/audit-logs', {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })
    const body = (await res.json()) as { data: { auditLogs: unknown[] } }
    expect(body.data.auditLogs.length).toBe(1)
  })

  it('8) Frontend batch sanitization removes PII', async () => {
    await createApp().request('http://localhost/analytics/events/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [
          { eventType: 'page.viewed', properties: { page: '/dashboard', password: 'x' } },
        ],
      }),
    })
    const row = store.events[0]
    expect(row?.properties['password']).toBeUndefined()
  })

  it('9) My usage aggregates token usage and events', async () => {
    store.tokenUsageByUser.set(userId, 45000)
    await processIncomingEvent('agent.run.completed', { userId, tokensUsed: 5000 })
    const res = await createApp().request('http://localhost/analytics/me/usage', {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    const body = (await res.json()) as { data: { tokensUsedThisMonth: number; agentRunsTotal: number } }
    expect(body.data.tokensUsedThisMonth).toBe(45000)
    expect(body.data.agentRunsTotal).toBe(1)
  })

  it('10) KPI request is cached on second request', async () => {
    const app = createApp()
    await app.request('http://localhost/analytics/admin/kpis?from=2025-01-01&to=2025-01-31&granularity=day', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    await app.request('http://localhost/analytics/admin/kpis?from=2025-01-01&to=2025-01-31&granularity=day', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const { getKpis } = await import('../../src/services/kpiAggregator.service.js')
    expect((getKpis as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
  })
})
