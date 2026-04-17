import { randomUUID } from 'node:crypto'

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { signTestAccessToken } from '../jwt.js'

const m = vi.hoisted(() => ({
  insertEvent: vi.fn(),
  insertEventsBatch: vi.fn(),
}))

vi.mock('../../src/db/queries/platformEvents.queries.js', () => ({
  insertEvent: m.insertEvent,
  insertEventsBatch: m.insertEventsBatch,
  getTimeSeriesEvents: vi.fn(),
  getUniqueDailyUsers: vi.fn(),
  getUserFunnelCohort: vi.fn(),
  getEventCountsByType: vi.fn(),
  getUserEventTimeline: vi.fn(),
}))

vi.mock('../../src/services/kpiAggregator.service.js', () => ({
  getKpis: vi.fn().mockResolvedValue({ summary: {}, timeSeries: [] }),
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
vi.mock('../../src/services/userActivity.service.js', () => ({
  getMyUsage: vi.fn().mockResolvedValue({}),
  getUserTimeline: vi.fn().mockResolvedValue({ events: [], summary: {} }),
}))
vi.mock('../../src/services/auditLog.service.js', () => ({
  queryAuditLogs: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  writeAuditEntry: vi.fn(),
}))

import { createApp } from '../../src/app.js'

describe('events.routes', () => {
  let token: string

  beforeAll(async () => {
    token = await signTestAccessToken({ userId: randomUUID() })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    m.insertEvent.mockResolvedValue(undefined)
    m.insertEventsBatch.mockResolvedValue(undefined)
  })

  it('POST /analytics/events inserts event with userId from JWT', async () => {
    const res = await createApp().request('http://localhost/analytics/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'page.viewed', properties: { page: '/dashboard' } }),
    })
    expect(res.status).toBe(200)
    expect(m.insertEvent).toHaveBeenCalledWith(expect.objectContaining({ userId: expect.any(String) }))
  })

  it('POST /analytics/events inserts event with userId=null for anon', async () => {
    const res = await createApp().request('http://localhost/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'page.viewed', properties: {} }),
    })
    expect(res.status).toBe(200)
    expect(m.insertEvent).toHaveBeenCalledWith(expect.objectContaining({ userId: null }))
  })

  it('POST /analytics/events strips PII keys', async () => {
    await createApp().request('http://localhost/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'page.viewed',
        properties: { page: '/x', password: 'secret', authToken: 'token' },
      }),
    })
    const payload = m.insertEvent.mock.calls[0]?.[0] as { properties: Record<string, unknown> }
    expect(payload.properties['password']).toBeUndefined()
    expect(payload.properties['authToken']).toBeUndefined()
    expect(payload.properties['page']).toBe('/x')
  })

  it('POST /analytics/events returns 200 when DB write fails', async () => {
    m.insertEvent.mockRejectedValueOnce(new Error('db down'))
    const res = await createApp().request('http://localhost/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'page.viewed' }),
    })
    expect(res.status).toBe(200)
  })

  it('POST /analytics/events/batch inserts all events', async () => {
    const res = await createApp().request('http://localhost/analytics/events/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{ eventType: 'page.viewed' }, { eventType: 'feature.flag.viewed' }, { eventType: 'page.viewed' }],
      }),
    })
    expect(res.status).toBe(200)
    expect(m.insertEventsBatch).toHaveBeenCalledOnce()
  })

  it('POST /analytics/events/batch rejects >100 events', async () => {
    const events = Array.from({ length: 101 }, () => ({ eventType: 'page.viewed' }))
    const res = await createApp().request('http://localhost/analytics/events/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    })
    expect(res.status).toBe(422)
  })

  it('POST /analytics/events/batch returns accepted + rejected', async () => {
    const res = await createApp().request('http://localhost/analytics/events/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{ eventType: 'page.viewed' }, { eventType: 'feature.flag.viewed' }],
      }),
    })
    const json = (await res.json()) as { data: { accepted: number; rejected: number } }
    expect(json.data.accepted).toBe(2)
    expect(json.data.rejected).toBe(0)
  })
})
