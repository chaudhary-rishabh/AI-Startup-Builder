import { beforeEach, describe, expect, it, vi } from 'vitest'

const integrationsMocks = vi.hoisted(() => ({
  findIntegrationsByUserId: vi.fn(),
  findIntegration: vi.fn(),
  upsertIntegration: vi.fn(),
  deleteIntegration: vi.fn(),
}))

const encryptMocks = vi.hoisted(() => ({
  encrypt: vi.fn((s: string) => `enc:${s}`),
}))

const publisherMocks = vi.hoisted(() => ({
  publishUserProfileUpdated: vi.fn(),
}))

vi.mock('../../src/db/queries/integrations.queries.js', () => integrationsMocks)
vi.mock('../../src/services/encryption.service.js', () => encryptMocks)
vi.mock('../../src/events/publisher.js', () => ({
  ...publisherMocks,
  publishUserDeleted: vi.fn(),
  publishUserApiKeyCreated: vi.fn(),
  publishUserApiKeyRevoked: vi.fn(),
  publishUserOnboardingCompleted: vi.fn(),
}))

const { createApp } = await import('../../src/app.js')
const { signTestAccessToken } = await import('../jwt-test.js')

const uid = '550e8400-e29b-41d4-a716-446655440000'
const now = new Date()
const past = new Date(Date.now() - 86_400_000)

function row(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'int-1',
    userId: uid,
    service: 'notion' as const,
    accessTokenEnc: 'secret-cipher',
    refreshTokenEnc: null as string | null,
    scopes: ['read'],
    metadata: { workspace: 'ws1' },
    expiresAt: null as Date | null,
    createdAt: now,
    updatedAt: now,
    ...over,
  }
}

describe('integrations routes', () => {
  let app: ReturnType<typeof createApp>
  let token: string

  beforeEach(async () => {
    vi.clearAllMocks()
    app = createApp()
    token = await signTestAccessToken({ sub: uid })
    publisherMocks.publishUserProfileUpdated.mockResolvedValue(undefined)
  })

  it('GET /users/me/integrations without auth → 401', async () => {
    const res = await app.request('http://localhost/users/me/integrations')
    expect(res.status).toBe(401)
  })

  it('GET /users/me/integrations returns list without encrypted tokens', async () => {
    integrationsMocks.findIntegrationsByUserId.mockResolvedValue([row()])
    const res = await app.request('http://localhost/users/me/integrations', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { integrations: unknown[] } }
    const json = JSON.stringify(body)
    expect(json).not.toContain('accessTokenEnc')
    expect(json).not.toContain('refreshTokenEnc')
    expect(json).not.toContain('secret-cipher')
    expect((body.data.integrations[0] as { service: string }).service).toBe('notion')
  })

  it('GET /users/me/integrations marks expired integrations', async () => {
    integrationsMocks.findIntegrationsByUserId.mockResolvedValue([row({ expiresAt: past })])
    const res = await app.request('http://localhost/users/me/integrations', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { integrations: { isExpired: boolean }[] } }
    expect(body.data.integrations[0]?.isExpired).toBe(true)
  })

  it('POST /users/me/integrations/:service with valid token → 201', async () => {
    integrationsMocks.upsertIntegration.mockResolvedValue(row({ metadata: { a: 1 } }))
    const res = await app.request('http://localhost/users/me/integrations/notion', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: 'tok', scopes: ['read'] }),
    })
    expect(res.status).toBe(201)
    expect(encryptMocks.encrypt).toHaveBeenCalledWith('tok')
    const body = (await res.json()) as { data: { integration: { service: string } } }
    expect(body.data.integration.service).toBe('notion')
  })

  it('POST /users/me/integrations/invalid-service → 400', async () => {
    const res = await app.request('http://localhost/users/me/integrations/slack', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: 'tok' }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /users/me/integrations/:service upserts second call', async () => {
    integrationsMocks.upsertIntegration
      .mockResolvedValueOnce(row({ id: 'first' }))
      .mockResolvedValueOnce(row({ id: 'first', updatedAt: new Date() }))
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    const r1 = await app.request('http://localhost/users/me/integrations/github', {
      method: 'POST',
      headers,
      body: JSON.stringify({ accessToken: 'a' }),
    })
    const r2 = await app.request('http://localhost/users/me/integrations/github', {
      method: 'POST',
      headers,
      body: JSON.stringify({ accessToken: 'b' }),
    })
    expect(r1.status).toBe(201)
    expect(r2.status).toBe(201)
    expect(integrationsMocks.upsertIntegration).toHaveBeenCalledTimes(2)
  })

  it('DELETE /users/me/integrations/:service existing → 200', async () => {
    integrationsMocks.findIntegration.mockResolvedValue(row())
    const res = await app.request('http://localhost/users/me/integrations/notion', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    expect(integrationsMocks.deleteIntegration).toHaveBeenCalledWith(uid, 'notion')
  })

  it('DELETE /users/me/integrations/:service not found → 404', async () => {
    integrationsMocks.findIntegration.mockResolvedValue(undefined)
    const res = await app.request('http://localhost/users/me/integrations/notion', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
  })
})
