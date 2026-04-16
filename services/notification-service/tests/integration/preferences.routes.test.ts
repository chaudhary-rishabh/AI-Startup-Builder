import { randomUUID } from 'node:crypto'

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { signTestAccessToken } from '../jwt.js'

const m = vi.hoisted(() => ({
  findOrCreatePrefs: vi.fn(),
  updatePrefs: vi.fn(),
}))

vi.mock('../../src/db/queries/notificationPrefs.queries.js', () => ({
  findOrCreatePrefs: m.findOrCreatePrefs,
  updatePrefs: m.updatePrefs,
}))

import { createApp } from '../../src/app.js'
import { getRedis } from '../../src/lib/redis.js'

describe('preferences.routes', () => {
  const userId = randomUUID()
  let token: string
  const basePrefs = {
    userId,
    emailEnabled: true,
    inAppEnabled: true,
    phaseComplete: true,
    agentDone: true,
    billingEvents: true,
    tokenWarnings: true,
    ragStatus: true,
    exportReady: true,
    weeklyDigest: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeAll(async () => {
    token = await signTestAccessToken({ userId })
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    await getRedis().flushall()
    m.findOrCreatePrefs.mockResolvedValue({ ...basePrefs })
    m.updatePrefs.mockImplementation(async (_uid: string, data: Record<string, unknown>) => ({
      ...basePrefs,
      ...data,
    }))
  })

  it('GET /notifications/preferences creates defaults on first call', async () => {
    const res = await createApp().request('http://localhost/notifications/preferences', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    expect(m.findOrCreatePrefs).toHaveBeenCalledOnce()
  })

  it('GET preferences always returns securityAlerts=true', async () => {
    const res = await createApp().request('http://localhost/notifications/preferences', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = (await res.json()) as { data: { securityAlerts: boolean } }
    expect(body.data.securityAlerts).toBe(true)
  })

  it('GET preferences cached in redis after first call', async () => {
    const app = createApp()
    await app.request('http://localhost/notifications/preferences', {
      headers: { Authorization: `Bearer ${token}` },
    })
    await app.request('http://localhost/notifications/preferences', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(m.findOrCreatePrefs).toHaveBeenCalledTimes(1)
  })

  it('PATCH preferences partial update works', async () => {
    const res = await createApp().request('http://localhost/notifications/preferences', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ billingEvents: false }),
    })
    expect(res.status).toBe(200)
    expect(m.updatePrefs).toHaveBeenCalledWith(userId, expect.objectContaining({ billingEvents: false }))
  })

  it('PATCH preferences ignores securityAlerts if sent', async () => {
    await createApp().request('http://localhost/notifications/preferences', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ securityAlerts: false, emailEnabled: false }),
    })
    expect(m.updatePrefs).toHaveBeenCalledWith(
      userId,
      expect.not.objectContaining({ securityAlerts: false }),
    )
  })

  it('PATCH preferences invalidates redis cache', async () => {
    await getRedis().set(`notif:prefs:${userId}`, '{"cached":true}')
    await createApp().request('http://localhost/notifications/preferences', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenWarnings: false }),
    })
    expect(await getRedis().get(`notif:prefs:${userId}`)).toBeNull()
  })
})
