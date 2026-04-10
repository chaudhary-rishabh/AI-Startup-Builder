import { beforeEach, describe, expect, it, vi } from 'vitest'

const profilesMocks = vi.hoisted(() => ({
  findAllProfiles: vi.fn(),
  findProfileById: vi.fn(),
}))

const authMocks = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
  verifyPassword: vi.fn(),
  softDeleteAuthUser: vi.fn(),
  patchAuthUserFullName: vi.fn(),
  completeAuthOnboarding: vi.fn(),
}))

vi.mock('../../src/db/queries/profiles.queries.js', () => profilesMocks)
vi.mock('../../src/services/authClient.service.js', () => authMocks)

const { createApp } = await import('../../src/app.js')
const { signTestAccessToken } = await import('../jwt-test.js')

const uid = '750e8400-e29b-41d4-a716-446655440002'
const adminId = '850e8400-e29b-41d4-a716-446655440003'
const now = new Date()

function profileRow(id: string) {
  return {
    id,
    roleType: 'FOUNDER' as const,
    bio: null,
    companyName: 'Acme',
    websiteUrl: null,
    timezone: 'UTC',
    notificationPrefs: {},
    themePrefs: {},
    createdAt: now,
    updatedAt: now,
  }
}

describe('admin routes', () => {
  let app: ReturnType<typeof createApp>
  let userToken: string
  let adminToken: string

  beforeEach(async () => {
    vi.clearAllMocks()
    app = createApp()
    userToken = await signTestAccessToken({ sub: uid, role: 'user' })
    adminToken = await signTestAccessToken({ sub: adminId, role: 'admin' })
  })

  it('GET /users without admin JWT → 403 FORBIDDEN', async () => {
    const res = await app.request('http://localhost/users?page=1', {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(res.status).toBe(403)
  })

  it('GET /users with admin JWT → 200 paginated list', async () => {
    profilesMocks.findAllProfiles.mockResolvedValue({
      data: [profileRow(uid) as never],
      total: 1,
    })

    const res = await app.request('http://localhost/users?page=1&limit=10', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: { users: unknown[] }; meta: { total: number } }
    expect(json.success).toBe(true)
    expect(json.data.users).toHaveLength(1)
    expect(json.meta.total).toBe(1)
  })

  it('GET /users with search query → filtered results', async () => {
    profilesMocks.findAllProfiles.mockResolvedValue({ data: [], total: 0 })

    await app.request('http://localhost/users?search=acme', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })

    expect(profilesMocks.findAllProfiles).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'acme' }),
    )
  })

  it('GET /users/:userId with admin → 200 full profile', async () => {
    profilesMocks.findProfileById.mockResolvedValue(profileRow(uid) as never)
    authMocks.getAuthUser.mockResolvedValue({
      id: uid,
      email: 'a@b.com',
      fullName: 'A',
      role: 'user',
      planTier: 'pro',
      status: 'active',
      onboardingCompleted: true,
      createdAt: now.toISOString(),
      avatarUrl: null,
    })

    const res = await app.request(`http://localhost/users/${uid}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { email: string } }
    expect(json.data.email).toBe('a@b.com')
  })

  it('GET /users/:userId non-existent → 404', async () => {
    profilesMocks.findProfileById.mockResolvedValue(undefined)
    authMocks.getAuthUser.mockResolvedValue(null)

    const res = await app.request(`http://localhost/users/${uid}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.status).toBe(404)
  })
})
