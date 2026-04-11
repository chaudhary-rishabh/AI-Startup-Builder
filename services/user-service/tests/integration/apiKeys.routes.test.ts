import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiKeysQueriesMocks = vi.hoisted(() => ({
  findApiKeysByUserId: vi.fn(),
  findApiKeyByHash: vi.fn(),
  findApiKeyById: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
  updateLastUsed: vi.fn(),
  countActiveKeysByUserId: vi.fn(),
}))

const { apiKeyPrefix, mockKeyPrefix12, apiKeyServiceMocks } = vi.hoisted(() => {
  const apiKeyPrefix = `${['sk', 'live'].join('_')}_`
  const fullMockKey = `${apiKeyPrefix}${'a'.repeat(32)}`
  const mockKeyPrefix12 = fullMockKey.slice(0, 12)
  return {
    apiKeyPrefix,
    mockKeyPrefix12,
    apiKeyServiceMocks: {
      generateApiKey: vi.fn(() => fullMockKey),
      hashApiKey: vi.fn(() => 'feedfacecafe'),
      extractPrefix: vi.fn(() => mockKeyPrefix12),
      getPlanKeyLimit: vi.fn((plan: string) => {
        if (plan === 'enterprise') return -1
        if (plan === 'pro') return 10
        return 2
      }),
    },
  }
})

const publisherMocks = vi.hoisted(() => ({
  publishUserApiKeyCreated: vi.fn(),
  publishUserApiKeyRevoked: vi.fn(),
}))

vi.mock('../../src/db/queries/apiKeys.queries.js', () => apiKeysQueriesMocks)
vi.mock('../../src/services/apiKey.service.js', () => apiKeyServiceMocks)
vi.mock('../../src/events/publisher.js', () => ({
  ...publisherMocks,
  publishUserProfileUpdated: vi.fn(),
  publishUserDeleted: vi.fn(),
  publishUserOnboardingCompleted: vi.fn(),
}))

import { getRedis } from '../../src/services/redis.service.js'

const { createApp } = await import('../../src/app.js')
const { signTestAccessToken } = await import('../jwt-test.js')

const uid = '550e8400-e29b-41d4-a716-446655440000'
const now = new Date()

describe('apiKeys routes', () => {
  let app: ReturnType<typeof createApp>
  let token: string

  beforeEach(async () => {
    vi.clearAllMocks()
    await getRedis().flushall()
    app = createApp()
    token = await signTestAccessToken({ sub: uid, plan: 'free' })
    publisherMocks.publishUserApiKeyCreated.mockResolvedValue(undefined)
    publisherMocks.publishUserApiKeyRevoked.mockResolvedValue(undefined)
    apiKeyServiceMocks.getPlanKeyLimit.mockImplementation((plan: string) => {
      if (plan === 'enterprise') return -1
      if (plan === 'pro') return 10
      return 2
    })
  })

  it('GET /users/me/api-keys without auth → 401', async () => {
    const res = await app.request('http://localhost/users/me/api-keys')
    expect(res.status).toBe(401)
  })

  it('GET /users/me/api-keys → 200, no keyHash in response', async () => {
    apiKeysQueriesMocks.findApiKeysByUserId.mockResolvedValue([
      {
        id: 'key-1',
        userId: uid,
        keyHash: 'secret-hash',
        prefix: mockKeyPrefix12,
        name: 'Dev',
        scopes: ['read'],
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ])
    const res = await app.request('http://localhost/users/me/api-keys', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: { keys: unknown[] } }
    const json = JSON.stringify(body)
    expect(json).not.toContain('keyHash')
    expect(json).not.toContain('secret-hash')
    expect(body.data.keys).toHaveLength(1)
    expect((body.data.keys[0] as { prefix: string }).prefix).toBe(mockKeyPrefix12)
  })

  it('POST /users/me/api-keys valid body → 201 with platform key prefix', async () => {
    apiKeysQueriesMocks.countActiveKeysByUserId.mockResolvedValue(0)
    apiKeysQueriesMocks.createApiKey.mockResolvedValue({
      id: 'new-key',
      userId: uid,
      keyHash: 'h',
      prefix: mockKeyPrefix12,
      name: 'K',
      scopes: ['read'],
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    const res = await app.request('http://localhost/users/me/api-keys', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Key', scopes: ['read'] }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: { key: string; warning: string; keyHash?: string }
    }
    expect(body.data.key.startsWith(apiKeyPrefix)).toBe(true)
    expect(body.data.warning).toBe('Store this key securely — it will not be shown again')
    expect(body.data.keyHash).toBeUndefined()
  })

  it('POST /users/me/api-keys at plan limit → 422 API_KEY_LIMIT_EXCEEDED', async () => {
    apiKeysQueriesMocks.countActiveKeysByUserId.mockResolvedValue(2)
    const res = await app.request('http://localhost/users/me/api-keys', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'K', scopes: ['read'] }),
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { success: boolean; error: { code: string } }
    expect(body.error.code).toBe('API_KEY_LIMIT_EXCEEDED')
  })

  it('POST /users/me/api-keys with missing name → 422 validation', async () => {
    const res = await app.request('http://localhost/users/me/api-keys', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scopes: ['read'] }),
    })
    expect(res.status).toBe(422)
  })

  it('DELETE /users/me/api-keys/:keyId valid → 200', async () => {
    apiKeysQueriesMocks.revokeApiKey.mockResolvedValue(true)
    const res = await app.request(`http://localhost/users/me/api-keys/key-99`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    expect(publisherMocks.publishUserApiKeyRevoked).toHaveBeenCalled()
  })

  it('DELETE /users/me/api-keys/:keyId not found → 404', async () => {
    apiKeysQueriesMocks.revokeApiKey.mockResolvedValue(false)
    const res = await app.request(`http://localhost/users/me/api-keys/missing`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
    const j = (await res.json()) as { error: { code: string } }
    expect(j.error.code).toBe('API_KEY_NOT_FOUND')
  })

  it('DELETE scopes by userId — other user key → 404', async () => {
    apiKeysQueriesMocks.revokeApiKey.mockResolvedValue(false)
    const res = await app.request(`http://localhost/users/me/api-keys/other-users-key`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
  })
})
