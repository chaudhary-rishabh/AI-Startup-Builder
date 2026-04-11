/**
 * End-to-end user-service checks against real Postgres + Redis (testcontainers).
 * File name `z-` so this suite runs last and can restore Redis mock for other tests.
 */
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { RedisContainer } from '@testcontainers/redis'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import Redis from 'ioredis-mock'

import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type { StartedRedisContainer } from '@testcontainers/redis'

const serviceRoot = path.join(fileURLToPath(new URL('../../', import.meta.url)))

const testUserId = '660e8400-e29b-41d4-a716-446655440001'
const adminUserId = '770e8400-e29b-41d4-a716-446655440002'
const missingUserId = '880e8400-e29b-41d4-a716-446655440099'

const savedEnv = {
  DATABASE_URL: process.env['DATABASE_URL'] ?? '',
  REDIS_URL: process.env['REDIS_URL'] ?? '',
}

const originalFetch = globalThis.fetch.bind(globalThis)

const authUsers = new Map<string, Record<string, unknown>>()

function seedAuthUsers() {
  authUsers.clear()
  authUsers.set(testUserId, {
    id: testUserId,
    email: 'flow@test.com',
    fullName: 'Flow User',
    role: 'user',
    planTier: 'free',
    status: 'active',
    onboardingCompleted: false,
    createdAt: new Date().toISOString(),
    avatarUrl: null,
  })
  authUsers.set(adminUserId, {
    id: adminUserId,
    email: 'admin@test.com',
    fullName: 'Admin User',
    role: 'admin',
    planTier: 'enterprise',
    status: 'active',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    avatarUrl: null,
  })
}

function installFetchMock(): void {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = init?.method ?? 'GET'

    if (url.includes('/update-avatar')) {
      return new Response(JSON.stringify({ success: true, data: { updated: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/complete-onboarding')) {
      return new Response(JSON.stringify({ success: true, data: { updated: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/soft-delete')) {
      return new Response(JSON.stringify({ success: true, data: { deleted: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/verify-password')) {
      return new Response(JSON.stringify({ success: true, data: { valid: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const patchMatch = url.match(/\/internal\/users\/([^/]+)$/)
    if (patchMatch && method === 'PATCH') {
      const uid = patchMatch[1]
      if (uid && init?.body) {
        try {
          const b = JSON.parse(String(init.body)) as { fullName?: string }
          const cur = authUsers.get(uid)
          if (cur && b.fullName !== undefined) {
            cur['fullName'] = b.fullName
          }
        } catch {
          /* ignore */
        }
      }
      return new Response(JSON.stringify({ success: true, data: { updated: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const getMatch = url.match(/\/internal\/users\/([^/]+)$/)
    if (getMatch && method === 'GET') {
      const uid = getMatch[1]
      const u = authUsers.get(uid)
      if (!u) {
        return new Response(null, { status: 404 })
      }
      return new Response(JSON.stringify({ success: true, data: u }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return originalFetch(input, init)
  }) as typeof fetch
}

let pg: StartedPostgreSqlContainer
let redisC: StartedRedisContainer
let app: import('hono').Hono
let bearer: (userId: string, role?: string, plan?: string) => Promise<string>

describe('fullFlow (testcontainers)', () => {
  beforeAll(
    async () => {
      seedAuthUsers()
      pg = await new PostgreSqlContainer('postgres:16-alpine').start()
      redisC = await new RedisContainer('redis:7-alpine').start()

      process.env['DATABASE_URL'] = pg.getConnectionUri()
      process.env['REDIS_URL'] = redisC.getConnectionUrl()

      execSync('pnpm exec drizzle-kit migrate', {
        cwd: serviceRoot,
        env: { ...process.env },
        stdio: 'pipe',
        shell: true,
      })

      vi.resetModules()
      const { setRedisForTests } = await import('../../src/services/redis.service.js')
      setRedisForTests(undefined)

      installFetchMock()

      const { createApp } = await import('../../src/app.js')
      const { handleUserRegistered } = await import('../../src/events/handlers/userRegistered.handler.js')
      const jwt = await import('../jwt-test.js')

      app = createApp()
      bearer = async (userId, role = 'user', plan = 'free') =>
        `Bearer ${await jwt.signTestAccessToken({ sub: userId, role, plan })}`

      await handleUserRegistered({
        userId: testUserId,
        email: 'flow@test.com',
        name: 'Flow User',
        plan: 'free',
      })
    },
    120_000,
  )

  afterAll(async () => {
    globalThis.fetch = originalFetch
    try {
      const { getRedis } = await import('../../src/services/redis.service.js')
      await getRedis().quit()
    } catch {
      /* ignore */
    }
    try {
      const { closeDbPools } = await import('../../src/lib/db.js')
      await closeDbPools()
    } catch {
      /* ignore */
    }
    await redisC?.stop()
    await pg?.stop()
    process.env['DATABASE_URL'] = savedEnv.DATABASE_URL
    process.env['REDIS_URL'] = savedEnv.REDIS_URL
    vi.resetModules()
    const { setRedisForTests } = await import('../../src/services/redis.service.js')
    setRedisForTests(new Redis())
  })

  it('GET /ready with real DB → 200 healthy', async () => {
    const res = await app.request('http://localhost/ready')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; db: string; redis: string }
    expect(body.status).toBe('healthy')
    expect(body.db).toBe('connected')
    expect(body.redis).toBe('connected')
  })

  it('GET /users/me → 200 profile', async () => {
    const res = await app.request('http://localhost/users/me', {
      headers: { Authorization: await bearer(testUserId) },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string; email: string } }
    expect(body.data.id).toBe(testUserId)
    expect(body.data.email).toBe('flow@test.com')
  })

  it('PATCH /users/me bio → 200', async () => {
    const res = await app.request('http://localhost/users/me', {
      method: 'PATCH',
      headers: {
        Authorization: await bearer(testUserId),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bio: 'Hello flow' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { bio: string | null } }
    expect(body.data.bio).toBe('Hello flow')
  })

  it('PATCH /users/me invalid websiteUrl → 422', async () => {
    const res = await app.request('http://localhost/users/me', {
      method: 'PATCH',
      headers: {
        Authorization: await bearer(testUserId),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ websiteUrl: 'not-a-valid-url' }),
    })
    expect(res.status).toBe(422)
  })

  it('GET /users/me/onboarding → 200 profile step', async () => {
    const res = await app.request('http://localhost/users/me/onboarding', {
      headers: { Authorization: await bearer(testUserId) },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { currentStep: string } }
    expect(body.data.currentStep).toBe('profile')
  })

  it('POST onboarding complete profile → idea', async () => {
    const res = await app.request('http://localhost/users/me/onboarding/complete', {
      method: 'POST',
      headers: {
        Authorization: await bearer(testUserId),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ step: 'profile', data: {} }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { currentStep: string } }
    expect(body.data.currentStep).toBe('idea')
  })

  it('POST onboarding complete plan before idea → 409', async () => {
    const res = await app.request('http://localhost/users/me/onboarding/complete', {
      method: 'POST',
      headers: {
        Authorization: await bearer(testUserId),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ step: 'plan', data: {} }),
    })
    expect(res.status).toBe(409)
  })

  it('POST onboarding complete idea → plan', async () => {
    const res = await app.request('http://localhost/users/me/onboarding/complete', {
      method: 'POST',
      headers: {
        Authorization: await bearer(testUserId),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ step: 'idea', data: {} }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { currentStep: string } }
    expect(body.data.currentStep).toBe('plan')
  })

  it('POST onboarding complete plan → complete', async () => {
    const res = await app.request('http://localhost/users/me/onboarding/complete', {
      method: 'POST',
      headers: {
        Authorization: await bearer(testUserId),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ step: 'plan', data: {} }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { isComplete: boolean } }
    expect(body.data.isComplete).toBe(true)
  })

  it('POST api-keys x2 then third fails free plan', async () => {
    const { API_KEY_PREFIX } = await import('../../src/services/apiKey.service.js')
    const h = {
      Authorization: await bearer(testUserId),
      'Content-Type': 'application/json',
    }
    const r1 = await app.request('http://localhost/users/me/api-keys', {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ name: 'K1', scopes: ['read'] }),
    })
    expect(r1.status).toBe(201)
    const k1 = (await r1.json()) as { data: { key: string; warning: string } }
    expect(k1.data.key.startsWith(API_KEY_PREFIX)).toBe(true)
    expect(k1.data.warning).toBeTruthy()
    const r2 = await app.request('http://localhost/users/me/api-keys', {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ name: 'K2', scopes: ['read'] }),
    })
    expect(r2.status).toBe(201)
    const r3 = await app.request('http://localhost/users/me/api-keys', {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ name: 'K3', scopes: ['read'] }),
    })
    expect(r3.status).toBe(422)
    const errBody = (await r3.json()) as { error: { code: string } }
    expect(errBody.error.code).toBe('API_KEY_LIMIT_EXCEEDED')
  })

  it('GET api-keys → 2 keys, no keyHash', async () => {
    const res = await app.request('http://localhost/users/me/api-keys', {
      headers: { Authorization: await bearer(testUserId) },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { keys: unknown[] } }
    expect(body.data.keys).toHaveLength(2)
    expect(JSON.stringify(body.data.keys)).not.toContain('keyHash')
  })

  it('DELETE one api key then list has 1', async () => {
    const list = await app.request('http://localhost/users/me/api-keys', {
      headers: { Authorization: await bearer(testUserId) },
    })
    const keys = (await list.json()) as { data: { keys: { id: string }[] } }
    const keyId = keys.data.keys[0]!.id

    const del = await app.request(`http://localhost/users/me/api-keys/${keyId}`, {
      method: 'DELETE',
      headers: { Authorization: await bearer(testUserId) },
    })
    expect(del.status).toBe(200)

    const again = await app.request('http://localhost/users/me/api-keys', {
      headers: { Authorization: await bearer(testUserId) },
    })
    const body = (await again.json()) as { data: { keys: unknown[] } }
    expect(body.data.keys).toHaveLength(1)
  })

  it('integrations notion CRUD flow', async () => {
    const auth = await bearer(testUserId)
    const post = await app.request('http://localhost/users/me/integrations/notion', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: 'secret-notion-token' }),
    })
    expect(post.status).toBe(201)
    const json = JSON.stringify(await post.json())
    expect(json).not.toContain('secret-notion-token')

    const get = await app.request('http://localhost/users/me/integrations', {
      headers: { Authorization: auth },
    })
    expect(get.status).toBe(200)
    const list = (await get.json()) as { data: { integrations: { service: string }[] } }
    expect(list.data.integrations.some((i) => i.service === 'notion')).toBe(true)

    const del = await app.request('http://localhost/users/me/integrations/notion', {
      method: 'DELETE',
      headers: { Authorization: auth },
    })
    expect(del.status).toBe(200)

    const empty = await app.request('http://localhost/users/me/integrations', {
      headers: { Authorization: auth },
    })
    const e = (await empty.json()) as { data: { integrations: unknown[] } }
    expect(e.data.integrations).toHaveLength(0)
  })

  it('admin GET /users → 200', async () => {
    const res = await app.request('http://localhost/users?page=1&limit=20', {
      headers: { Authorization: await bearer(adminUserId, 'admin', 'enterprise') },
    })
    expect(res.status).toBe(200)
  })

  it('GET /users as user → 403', async () => {
    const res = await app.request('http://localhost/users', {
      headers: { Authorization: await bearer(testUserId) },
    })
    expect(res.status).toBe(403)
  })

  it('admin GET /users/:userId → 200', async () => {
    const res = await app.request(`http://localhost/users/${testUserId}`, {
      headers: { Authorization: await bearer(adminUserId, 'admin', 'enterprise') },
    })
    expect(res.status).toBe(200)
  })

  it('admin GET unknown user → 404', async () => {
    const res = await app.request(`http://localhost/users/${missingUserId}`, {
      headers: { Authorization: await bearer(adminUserId, 'admin', 'enterprise') },
    })
    expect(res.status).toBe(404)
  })
})
