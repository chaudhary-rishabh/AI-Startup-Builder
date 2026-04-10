import { afterEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../../src/app.js'
import * as oauthSvc from '../../src/services/oauth.service.js'

describe('oauth routes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('GET /auth/oauth/google returns 200 with authUrl', async () => {
    const app = createApp()
    const res = await app.request('/auth/oauth/google')
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: { authUrl: string; state: string } }
    expect(json.success).toBe(true)
    expect(json.data.authUrl).toContain('accounts.google.com')
    expect(json.data.state.length).toBeGreaterThan(8)
  })

  it('GET /auth/oauth/google/callback with invalid state → 400', async () => {
    const app = createApp()
    const res = await app.request('/auth/oauth/google/callback?code=fake&state=nonexistent')
    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe('INVALID_REQUEST')
  })

  it('GET /auth/oauth/google/callback redirects when error param is present', async () => {
    const app = createApp()
    const res = await app.request('/auth/oauth/google/callback?error=access_denied')
    expect(res.status).toBe(302)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('error=access_denied')
  })

  it('GET /auth/oauth/google/callback success issues tokens when OAuth completes', async () => {
    const app = createApp()
    const start = await app.request('/auth/oauth/google')
    const { state } = ((await start.json()) as { data: { state: string } }).data

    vi.spyOn(oauthSvc, 'exchangeCodeForTokens').mockResolvedValue({
      userInfo: { sub: 'g1', email: 'ok@test.com', name: 'Ok' },
      tokens: { access_token: 'at' },
    })
    const now = new Date()
    vi.spyOn(oauthSvc, 'handleOAuthCallback').mockResolvedValue({
      user: {
        id: 'u-oauth',
        email: 'ok@test.com',
        emailVerifiedAt: now,
        passwordHash: null,
        fullName: 'Ok',
        avatarUrl: null,
        role: 'user',
        planTier: 'free',
        status: 'active',
        onboardingCompleted: false,
        lastActiveAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        emailVerificationToken: null,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      isNewUser: false,
      tokenPair: {
        accessToken: 'a.j.t',
        refreshToken: 'r.j.t',
        expiresIn: 900,
      },
    })

    const refreshMod = await import('../../src/db/queries/refreshTokens.queries.js')
    const usersMod = await import('../../src/db/queries/users.queries.js')
    vi.spyOn(refreshMod, 'createRefreshToken').mockResolvedValue({
      id: 'rt1',
      userId: 'u-oauth',
      tokenHash: 'h',
      deviceInfo: null,
      expiresAt: new Date(Date.now() + 86_400_000),
      revokedAt: null,
      replacedByTokenId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.spyOn(usersMod, 'updateLastActive').mockResolvedValue(undefined)

    const res = await app.request(`/auth/oauth/google/callback?code=abc&state=${encodeURIComponent(state)}`)
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      data: { accessToken: string; refreshToken: string; isNewUser: boolean }
    }
    expect(json.data.accessToken).toBe('a.j.t')
    expect(json.data.isNewUser).toBe(false)
  })

  it('GET /auth/oauth/google/callback returns MFA challenge when required', async () => {
    const app = createApp()
    const start = await app.request('/auth/oauth/google')
    const { state } = ((await start.json()) as { data: { state: string } }).data

    vi.spyOn(oauthSvc, 'exchangeCodeForTokens').mockResolvedValue({
      userInfo: { sub: 'g2', email: 'mfa@test.com', name: 'M' },
      tokens: { access_token: 'at' },
    })
    vi.spyOn(oauthSvc, 'handleOAuthCallback').mockResolvedValue({
      requiresMfa: true,
      mfaTempToken: 'temp.jwt',
    })

    const res = await app.request(`/auth/oauth/google/callback?code=abc&state=${encodeURIComponent(state)}`)
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { requiresMfa: boolean; mfaTempToken: string } }
    expect(json.data.requiresMfa).toBe(true)
    expect(json.data.mfaTempToken).toBe('temp.jwt')
  })
})
