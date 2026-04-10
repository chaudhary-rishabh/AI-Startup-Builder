import { randomUUID } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { OAuthAccount, User } from '../../src/db/schema.js'

const userMocks = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUser: vi.fn(),
}))

const oauthMocks = vi.hoisted(() => ({
  findOAuthAccount: vi.fn(),
  upsertOAuthAccount: vi.fn(),
}))

const mfaMocks = vi.hoisted(() => ({
  findMfaByUserId: vi.fn(),
}))

vi.mock('../../src/db/queries/users.queries.js', () => userMocks)
vi.mock('../../src/db/queries/oauthAccounts.queries.js', () => oauthMocks)
vi.mock('../../src/db/queries/mfaCredentials.queries.js', () => mfaMocks)

describe('oauth.service', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.clearAllMocks()
  })

  beforeEach(async () => {
    const redis = (await import('../../src/services/redis.service.js')).getRedis()
    const keys = await redis.keys('oauth:state:*')
    if (keys.length) await redis.del(...keys)
  })

  it('generateAuthUrl returns url with PKCE params', async () => {
    const { generateAuthUrl } = await import('../../src/services/oauth.service.js')
    const { url, state } = await generateAuthUrl()
    expect(url).toContain('accounts.google.com')
    expect(url).toContain('code_challenge=')
    expect(url).toContain('code_challenge_method=S256')
    expect(state.length).toBeGreaterThan(10)
    const redis = (await import('../../src/services/redis.service.js')).getRedis()
    const raw = await redis.get(`oauth:state:${state}`)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw as string) as { codeVerifier: string }
    expect(typeof parsed.codeVerifier).toBe('string')
  })

  it('exchangeCodeForTokens calls Google token endpoint with codeVerifier', async () => {
    const { generateAuthUrl, exchangeCodeForTokens } = await import('../../src/services/oauth.service.js')
    const { state } = await generateAuthUrl()

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = String(input)
      if (u.includes('oauth2.googleapis.com/token')) {
        expect(init?.body?.toString()).toContain('code_verifier=')
        return new Response(JSON.stringify({ access_token: 'at', token_type: 'Bearer' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (u.includes('googleapis.com/oauth2/v3/userinfo')) {
        return new Response(
          JSON.stringify({ sub: 'g1', email: 'g@example.com', name: 'G User' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response('not found', { status: 404 })
    })
    globalThis.fetch = fetchMock as typeof fetch

    const out = await exchangeCodeForTokens('auth-code', state)
    expect(out.userInfo.email).toBe('g@example.com')
    expect(out.userInfo.sub).toBe('g1')
    expect(fetchMock).toHaveBeenCalled()
  })

  function baseUser(overrides: Partial<User> = {}): User {
    const now = new Date()
    return {
      id: 'u1',
      email: 'g@example.com',
      emailVerifiedAt: new Date(),
      passwordHash: null,
      fullName: 'G User',
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
      ...overrides,
    }
  }

  it('handleOAuthCallback creates new user for new Google account', async () => {
    oauthMocks.findOAuthAccount.mockResolvedValue(undefined)
    userMocks.findUserByEmail.mockResolvedValue(undefined)
    const created = baseUser({ id: 'new-u' })
    userMocks.createUser.mockResolvedValue(created)
    oauthMocks.upsertOAuthAccount.mockResolvedValue({} as never)
    mfaMocks.findMfaByUserId.mockResolvedValue(undefined)

    const { handleOAuthCallback } = await import('../../src/services/oauth.service.js')
    const result = await handleOAuthCallback(
      { sub: 'g99', email: 'new@example.com', name: 'New' },
      { access_token: 'x' },
    )

    expect('requiresMfa' in result).toBe(false)
    if ('tokenPair' in result) {
      expect(result.isNewUser).toBe(true)
      expect(userMocks.createUser).toHaveBeenCalled()
    }
  })

  it('handleOAuthCallback links OAuth to existing email account', async () => {
    oauthMocks.findOAuthAccount.mockResolvedValue(undefined)
    const existing = baseUser({ id: 'exist', email: 'old@example.com' })
    userMocks.findUserByEmail.mockResolvedValue(existing)
    oauthMocks.upsertOAuthAccount.mockResolvedValue({} as never)
    mfaMocks.findMfaByUserId.mockResolvedValue(undefined)

    const { handleOAuthCallback } = await import('../../src/services/oauth.service.js')
    const result = await handleOAuthCallback(
      { sub: 'g-link', email: 'old@example.com', name: 'Old' },
      { access_token: 'x' },
    )

    expect('requiresMfa' in result).toBe(false)
    if ('isNewUser' in result) {
      expect(result.isNewUser).toBe(false)
      expect(userMocks.createUser).not.toHaveBeenCalled()
    }
  })

  it('handleOAuthCallback loads user when Google account was previously linked', async () => {
    const now = new Date()
    const linked: OAuthAccount = {
      id: 'oa-1',
      userId: 'u1',
      provider: 'google',
      providerAccountId: 'g-existing',
      accessToken: 'old',
      refreshToken: null,
      accessTokenExpiresAt: null,
      scope: null,
      rawProfile: null,
      createdAt: now,
      updatedAt: now,
    }
    oauthMocks.findOAuthAccount.mockResolvedValue(linked)
    userMocks.findUserById.mockResolvedValue(baseUser({ id: 'u1' }))
    oauthMocks.upsertOAuthAccount.mockResolvedValue(linked)
    mfaMocks.findMfaByUserId.mockResolvedValue(undefined)

    const { handleOAuthCallback } = await import('../../src/services/oauth.service.js')
    const result = await handleOAuthCallback(
      { sub: 'g-existing', email: 'g@example.com', name: 'G' },
      { access_token: 'new' },
    )

    expect('tokenPair' in result).toBe(true)
    expect(userMocks.findUserByEmail).not.toHaveBeenCalled()
  })

  it('handleOAuthCallback rejects suspended users', async () => {
    oauthMocks.findOAuthAccount.mockResolvedValue(undefined)
    userMocks.findUserByEmail.mockResolvedValue(baseUser({ status: 'suspended' }))
    oauthMocks.upsertOAuthAccount.mockResolvedValue({} as never)

    const { handleOAuthCallback } = await import('../../src/services/oauth.service.js')
    await expect(
      handleOAuthCallback(
        { sub: 'g-s', email: 'g@example.com', name: 'G' },
        { access_token: 'x' },
      ),
    ).rejects.toMatchObject({
      oauthRouteError: true,
      status: 403,
      code: 'ACCOUNT_SUSPENDED',
    })
  })

  it('handleOAuthCallback returns requiresMfa when user has 2FA enabled', async () => {
    oauthMocks.findOAuthAccount.mockResolvedValue(undefined)
    userMocks.findUserByEmail.mockResolvedValue(baseUser())
    oauthMocks.upsertOAuthAccount.mockResolvedValue({} as never)
    mfaMocks.findMfaByUserId.mockResolvedValue({
      id: randomUUID(),
      userId: 'u1',
      totpSecret: 'enc',
      backupCodes: [],
      isEnabled: true,
      enabledAt: new Date(),
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const { handleOAuthCallback } = await import('../../src/services/oauth.service.js')
    const result = await handleOAuthCallback(
      { sub: 'g2', email: 'g@example.com', name: 'G' },
      { access_token: 'x' },
    )

    expect('requiresMfa' in result && result.requiresMfa).toBe(true)
    if ('requiresMfa' in result && result.requiresMfa) {
      expect(result.mfaTempToken.length).toBeGreaterThan(20)
    }
  })
})
