import { authenticator } from 'otplib'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { User } from '../../src/db/schema.js'
import { encrypt } from '../../src/services/encryption.service.js'
import { clearAdminAttempts } from '../../src/services/bruteForce.service.js'
import { adminBruteForceKey } from '../../src/services/redis.service.js'
import { hashPassword } from '../../src/services/password.service.js'

const userMocks = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  resetFailedLoginAttempts: vi.fn(),
  updateLastActive: vi.fn(),
}))

const mfaMocks = vi.hoisted(() => ({
  findMfaByUserId: vi.fn(),
}))

const refreshMocks = vi.hoisted(() => ({
  createRefreshToken: vi.fn(),
}))

vi.mock('../../src/db/queries/users.queries.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/db/queries/users.queries.js')>()
  return {
    ...actual,
    findUserByEmail: userMocks.findUserByEmail,
    resetFailedLoginAttempts: userMocks.resetFailedLoginAttempts,
    updateLastActive: userMocks.updateLastActive,
  }
})

vi.mock('../../src/db/queries/mfaCredentials.queries.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/db/queries/mfaCredentials.queries.js')>()
  return {
    ...actual,
    findMfaByUserId: mfaMocks.findMfaByUserId,
  }
})

vi.mock('../../src/db/queries/refreshTokens.queries.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/db/queries/refreshTokens.queries.js')>()
  return {
    ...actual,
    createRefreshToken: refreshMocks.createRefreshToken,
  }
})

const { createApp } = await import('../../src/app.js')

function adminUser(passwordHash: string, overrides: Partial<User> = {}): User {
  const now = new Date()
  return {
    id: 'admin-1',
    email: 'admin@test.com',
    emailVerifiedAt: new Date(),
    passwordHash,
    fullName: 'Admin',
    avatarUrl: null,
    role: 'admin',
    planTier: 'enterprise',
    status: 'active',
    onboardingCompleted: true,
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

describe('admin routes', () => {
  let passwordHash: string
  let totpSecret: string
  let encryptedSecret: string
  let app: ReturnType<typeof createApp>

  beforeAll(async () => {
    passwordHash = await hashPassword('AdminPass1!')
    totpSecret = authenticator.generateSecret()
    encryptedSecret = encrypt(totpSecret)
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    const { getRedis } = await import('../../src/services/redis.service.js')
    await getRedis().del(adminBruteForceKey('unknown'))
    app = createApp()
    refreshMocks.createRefreshToken.mockResolvedValue({
      id: 'rt',
      userId: 'admin-1',
      tokenHash: 'h',
      deviceInfo: null,
      expiresAt: new Date(Date.now() + 86_400_000),
      revokedAt: null,
      replacedByTokenId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  })

  it('POST /admin/login with non-admin account → 401', async () => {
    userMocks.findUserByEmail.mockResolvedValue(adminUser(passwordHash, { role: 'user' }))

    const res = await app.request('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'AdminPass1!',
        totpCode: '123456',
      }),
    })

    expect(res.status).toBe(401)
    const json = (await res.json()) as { error: { code: string; message: string } }
    expect(json.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('POST /admin/login with no 2FA set up → 403 MFA_REQUIRED', async () => {
    userMocks.findUserByEmail.mockResolvedValue(adminUser(passwordHash))
    mfaMocks.findMfaByUserId.mockResolvedValue(undefined)

    const res = await app.request('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'AdminPass1!',
        totpCode: '123456',
      }),
    })

    expect(res.status).toBe(403)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe('MFA_REQUIRED')
  })

  it('POST /admin/login with wrong TOTP → 401', async () => {
    userMocks.findUserByEmail.mockResolvedValue(adminUser(passwordHash))
    mfaMocks.findMfaByUserId.mockResolvedValue({
      id: 'm1',
      userId: 'admin-1',
      totpSecret: encryptedSecret,
      backupCodes: [],
      isEnabled: true,
      enabledAt: new Date(),
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const res = await app.request('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'AdminPass1!',
        totpCode: '000000',
      }),
    })

    expect(res.status).toBe(401)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe('INVALID_TOTP_CODE')
  })

  it('POST /admin/login all correct → 200 with tokens', async () => {
    userMocks.findUserByEmail.mockResolvedValue(adminUser(passwordHash))
    mfaMocks.findMfaByUserId.mockResolvedValue({
      id: 'm1',
      userId: 'admin-1',
      totpSecret: encryptedSecret,
      backupCodes: [],
      isEnabled: true,
      enabledAt: new Date(),
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const code = authenticator.generate(totpSecret)

    const res = await app.request('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'AdminPass1!',
        totpCode: code,
      }),
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      data: { accessToken: string; refreshToken: string; user: { role: string } }
    }
    expect(json.data.accessToken).toBeTruthy()
    expect(json.data.user.role).toBe('admin')
  })

  it('POST /admin/login 6 failed attempts → 429', async () => {
    userMocks.findUserByEmail.mockResolvedValue(undefined)

    for (let i = 0; i < 5; i += 1) {
      const res = await app.request('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nobody@test.com',
          password: 'x',
          totpCode: '123456',
        }),
      })
      expect(res.status).toBe(401)
    }

    const blocked = await app.request('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nobody@test.com',
        password: 'x',
        totpCode: '123456',
      }),
    })

    expect(blocked.status).toBe(429)
    await clearAdminAttempts('unknown')
  })
})
