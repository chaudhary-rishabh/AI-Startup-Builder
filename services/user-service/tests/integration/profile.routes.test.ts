import { beforeEach, describe, expect, it, vi } from 'vitest'

const profilesMocks = vi.hoisted(() => ({
  findProfileById: vi.fn(),
  updateProfile: vi.fn(),
  deleteProfile: vi.fn(),
}))

const authMocks = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
  verifyPassword: vi.fn(),
  softDeleteAuthUser: vi.fn(),
  patchAuthUserFullName: vi.fn(),
  completeAuthOnboarding: vi.fn(),
}))

const integrationsMocks = vi.hoisted(() => ({
  deleteAllIntegrationsForUser: vi.fn(),
}))

const publisherMocks = vi.hoisted(() => ({
  publishUserProfileUpdated: vi.fn(),
  publishUserDeleted: vi.fn(),
}))

vi.mock('../../src/db/queries/profiles.queries.js', () => profilesMocks)
vi.mock('../../src/services/authClient.service.js', () => authMocks)
vi.mock('../../src/db/queries/integrations.queries.js', () => integrationsMocks)
vi.mock('../../src/events/publisher.js', () => publisherMocks)

const { createApp } = await import('../../src/app.js')
const { signTestAccessToken } = await import('../jwt-test.js')

const uid = '550e8400-e29b-41d4-a716-446655440000'
const now = new Date()

function baseProfile() {
  return {
    id: uid,
    roleType: 'FOUNDER' as const,
    bio: 'hi',
    companyName: 'Co',
    websiteUrl: 'https://co.com',
    timezone: 'UTC',
    notificationPrefs: { emailOnPhaseComplete: true, emailOnBilling: true, inAppAll: true },
    themePrefs: { preferredMode: 'design' as const, sidebarCollapsed: false },
    createdAt: now,
    updatedAt: now,
  }
}

function baseAuth() {
  return {
    id: uid,
    email: 'u@test.com',
    fullName: 'User',
    role: 'user',
    planTier: 'free',
    status: 'active',
    onboardingCompleted: false,
    createdAt: now.toISOString(),
    avatarUrl: null as string | null,
  }
}

describe('profile routes', () => {
  let app: ReturnType<typeof createApp>
  let token: string

  beforeEach(async () => {
    vi.clearAllMocks()
    app = createApp()
    token = await signTestAccessToken({ sub: uid })
    publisherMocks.publishUserProfileUpdated.mockResolvedValue(undefined)
    publisherMocks.publishUserDeleted.mockResolvedValue(undefined)
  })

  it('GET /users/me without JWT → 401', async () => {
    const res = await app.request('http://localhost/users/me')
    expect(res.status).toBe(401)
  })

  it('GET /users/me with valid JWT → 200 with merged profile shape', async () => {
    profilesMocks.findProfileById.mockResolvedValue(baseProfile() as never)
    authMocks.getAuthUser.mockResolvedValue(baseAuth())

    const res = await app.request('http://localhost/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: { email: string; companyName: string } }
    expect(json.success).toBe(true)
    expect(json.data.email).toBe('u@test.com')
    expect(json.data.companyName).toBe('Co')
  })

  it('GET /users/me when profile not found → 404', async () => {
    profilesMocks.findProfileById.mockResolvedValue(undefined)
    authMocks.getAuthUser.mockResolvedValue(baseAuth())

    const res = await app.request('http://localhost/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe('PROFILE_NOT_FOUND')
  })

  it('PATCH /users/me with valid body → 200 updated profile', async () => {
    profilesMocks.findProfileById.mockResolvedValue(baseProfile() as never)
    const updated = { ...baseProfile(), companyName: 'NewCo' }
    profilesMocks.updateProfile.mockResolvedValue(updated as never)
    authMocks.getAuthUser.mockResolvedValue({
      ...baseAuth(),
      fullName: 'User',
    })

    const res = await app.request('http://localhost/users/me', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyName: 'NewCo' }),
    })
    expect(res.status).toBe(200)
    expect(publisherMocks.publishUserProfileUpdated).toHaveBeenCalled()
  })

  it('PATCH /users/me with invalid body → 422', async () => {
    profilesMocks.findProfileById.mockResolvedValue(baseProfile() as never)

    const res = await app.request('http://localhost/users/me', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullName: 'x' }),
    })
    expect(res.status).toBe(422)
  })

  it('DELETE /users/me with correct password → 200', async () => {
    authMocks.verifyPassword.mockResolvedValue(true)

    const res = await app.request('http://localhost/users/me', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: 'Secret1!' }),
    })
    expect(res.status).toBe(200)
    expect(integrationsMocks.deleteAllIntegrationsForUser).toHaveBeenCalledWith(uid)
    expect(profilesMocks.deleteProfile).toHaveBeenCalledWith(uid)
    expect(authMocks.softDeleteAuthUser).toHaveBeenCalled()
  })

  it('DELETE /users/me with wrong password → 401', async () => {
    authMocks.verifyPassword.mockResolvedValue(false)

    const res = await app.request('http://localhost/users/me', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: 'wrong' }),
    })
    expect(res.status).toBe(401)
  })
})
