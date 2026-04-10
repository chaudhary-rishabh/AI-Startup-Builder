import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { RedisContainer } from '@testcontainers/redis'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const serviceRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('auth-service full flow (testcontainers)', () => {
  let pg: Awaited<ReturnType<PostgreSqlContainer['start']>>
  let redis: Awaited<ReturnType<RedisContainer['start']>>
  let createApp: typeof import('../../src/app.js').createApp
  let findUserByEmail: typeof import('../../src/db/queries/users.queries.js').findUserByEmail

  beforeAll(async () => {
    pg = await new PostgreSqlContainer('postgres:16').start()
    redis = await new RedisContainer('redis:7').start()

    process.env.DATABASE_URL = pg.getConnectionUri()
    process.env.REDIS_URL = redis.getConnectionUrl()

    execSync('pnpm exec drizzle-kit migrate', {
      cwd: serviceRoot,
      stdio: 'pipe',
      env: { ...process.env },
      shell: process.platform === 'win32' ? (process.env['ComSpec'] ?? 'cmd.exe') : '/bin/bash',
    })

    vi.resetModules()
    const appMod = await import('../../src/app.js')
    createApp = appMod.createApp
    const uq = await import('../../src/db/queries/users.queries.js')
    findUserByEmail = uq.findUserByEmail
  }, 300_000)

  afterAll(async () => {
    await redis?.stop()
    await pg?.stop()
  })

  it(
    'runs register → conflict → bad login → verify → login → sessions → refresh rotation → logout',
    async () => {
      const email = `e2e-${Date.now()}@example.com`
      const password = 'Test123!'
      const app = createApp()

      const reg = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName: 'E2E User',
          role: 'FOUNDER',
        }),
      })
      expect(reg.status).toBe(201)
      const regJson = (await reg.json()) as { success: boolean; data: { userId: string } }
      expect(regJson.success).toBe(true)
      expect(regJson.data.userId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )

      const dup = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName: 'E2E User',
          role: 'FOUNDER',
        }),
      })
      expect(dup.status).toBe(409)

      const badLogin = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Wrongpass1!' }),
      })
      expect(badLogin.status).toBe(401)

      const user = await findUserByEmail(email)
      expect(user?.emailVerificationToken).toBeTruthy()
      const verifyTok = user!.emailVerificationToken!

      const verified = await app.request('/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyTok }),
      })
      expect(verified.status).toBe(200)

      const login = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      expect(login.status).toBe(200)
      const loginJson = (await login.json()) as {
        success: boolean
        data: { accessToken: string; refreshToken: string }
      }
      expect(loginJson.success).toBe(true)
      const accessToken = loginJson.data.accessToken
      const refreshToken = loginJson.data.refreshToken

      const sessOk = await app.request('/auth/sessions', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(sessOk.status).toBe(200)
      const sessJson = (await sessOk.json()) as { success: boolean; data: { sessions: unknown[] } }
      expect(sessJson.success).toBe(true)
      expect(sessJson.data.sessions.length).toBeGreaterThanOrEqual(1)

      const sessNo = await app.request('/auth/sessions')
      expect(sessNo.status).toBe(401)

      const ref = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      expect(ref.status).toBe(200)
      const refJson = (await ref.json()) as {
        success: boolean
        data: { accessToken: string; refreshToken: string }
      }
      expect(refJson.success).toBe(true)
      const latestRefresh = refJson.data.refreshToken
      expect(latestRefresh).not.toBe(refreshToken)

      const oldRef = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      expect(oldRef.status).toBe(401)
      const oldJson = (await oldRef.json()) as { error: { code: string } }
      expect(oldJson.error.code).toBe('TOKEN_REVOKED')

      const out = await app.request('/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: latestRefresh }),
      })
      expect(out.status).toBe(200)

      const afterOut = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: latestRefresh }),
      })
      expect(afterOut.status).toBe(401)
    },
    120_000,
  )
})
