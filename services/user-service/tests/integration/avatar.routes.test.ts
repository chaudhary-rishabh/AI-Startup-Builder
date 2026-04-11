import { beforeEach, describe, expect, it, vi } from 'vitest'

const s3Mocks = vi.hoisted(() => ({
  generateAvatarUploadUrl: vi.fn(),
  deleteAvatar: vi.fn(),
  buildAvatarCdnUrl: vi.fn((key: string) => `https://test-uploads-bucket.s3.us-east-1.amazonaws.com/${key}`),
  extractS3KeyFromUploadsUrl: vi.fn((url: string) => {
    const p = 'https://test-uploads-bucket.s3.us-east-1.amazonaws.com/'
    return url.startsWith(p) ? url.slice(p.length) : null
  }),
}))

const authMocks = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
  updateAuthUserAvatar: vi.fn(),
}))

const publisherMocks = vi.hoisted(() => ({
  publishUserProfileUpdated: vi.fn(),
}))

vi.mock('../../src/services/s3.service.js', () => s3Mocks)
vi.mock('../../src/services/authClient.service.js', () => ({
  getAuthUser: authMocks.getAuthUser,
  verifyPassword: vi.fn(),
  softDeleteAuthUser: vi.fn(),
  patchAuthUserFullName: vi.fn(),
  completeAuthOnboarding: vi.fn(),
  updateAuthUserAvatar: authMocks.updateAuthUserAvatar,
}))

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

describe('avatar routes', () => {
  let app: ReturnType<typeof createApp>
  let token: string

  beforeEach(async () => {
    vi.clearAllMocks()
    app = createApp()
    token = await signTestAccessToken({ sub: uid })
    publisherMocks.publishUserProfileUpdated.mockResolvedValue(undefined)
    s3Mocks.deleteAvatar.mockResolvedValue(undefined)
  })

  it('POST /users/me/avatar with jpg → 200 with uploadUrl', async () => {
    s3Mocks.generateAvatarUploadUrl.mockResolvedValue({
      uploadUrl: 'https://signed/put',
      s3Key: `avatars/${uid}/1.jpg`,
      cdnUrl: `https://test-uploads-bucket.s3.us-east-1.amazonaws.com/avatars/${uid}/1.jpg`,
    })
    const res = await app.request('http://localhost/users/me/avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileExtension: 'jpg' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { uploadUrl: string; expiresIn: number } }
    expect(body.data.uploadUrl).toBe('https://signed/put')
    expect(body.data.expiresIn).toBe(300)
  })

  it('POST /users/me/avatar with invalid extension → 415', async () => {
    s3Mocks.generateAvatarUploadUrl.mockRejectedValue(new Error('Invalid file type'))
    const res = await app.request('http://localhost/users/me/avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileExtension: 'gif' }),
    })
    expect(res.status).toBe(415)
  })

  it('PATCH /users/me/avatar/confirm with valid s3Key → 200', async () => {
    const key = `avatars/${uid}/99.png`
    authMocks.getAuthUser.mockResolvedValue({
      id: uid,
      email: 'u@test.com',
      fullName: 'U',
      role: 'user',
      planTier: 'free',
      status: 'active',
      onboardingCompleted: true,
      createdAt: '',
      avatarUrl: null,
    })
    const res = await app.request('http://localhost/users/me/avatar/confirm', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3Key: key }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { avatarUrl: string } }
    expect(body.data.avatarUrl).toContain(key)
    expect(authMocks.updateAuthUserAvatar).toHaveBeenCalledWith(
      uid,
      body.data.avatarUrl,
      expect.anything(),
    )
  })

  it('PATCH /users/me/avatar/confirm with s3Key for different user → 403', async () => {
    const res = await app.request('http://localhost/users/me/avatar/confirm', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3Key: 'avatars/other-user-id/x.png' }),
    })
    expect(res.status).toBe(403)
  })

  it('DELETE /users/me/avatar when no custom avatar → 404', async () => {
    authMocks.getAuthUser.mockResolvedValue({
      id: uid,
      email: 'u@test.com',
      fullName: 'U',
      role: 'user',
      planTier: 'free',
      status: 'active',
      onboardingCompleted: true,
      createdAt: '',
      avatarUrl: null,
    })
    const res = await app.request('http://localhost/users/me/avatar', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
  })

  it('DELETE /users/me/avatar when gravatar only → 404', async () => {
    authMocks.getAuthUser.mockResolvedValue({
      id: uid,
      email: 'u@test.com',
      fullName: 'U',
      role: 'user',
      planTier: 'free',
      status: 'active',
      onboardingCompleted: true,
      createdAt: '',
      avatarUrl: 'https://www.gravatar.com/avatar/abc?d=mp',
    })
    const res = await app.request('http://localhost/users/me/avatar', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
  })

  it('DELETE /users/me/avatar when S3 avatar exists → 200 with gravatar fallback', async () => {
    const url = `https://test-uploads-bucket.s3.us-east-1.amazonaws.com/avatars/${uid}/old.webp`
    authMocks.getAuthUser.mockResolvedValue({
      id: uid,
      email: 'fixed@example.com',
      fullName: 'U',
      role: 'user',
      planTier: 'free',
      status: 'active',
      onboardingCompleted: true,
      createdAt: '',
      avatarUrl: url,
    })
    const res = await app.request('http://localhost/users/me/avatar', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { avatarUrl: string; message: string } }
    expect(body.data.message).toBe('Avatar removed')
    expect(body.data.avatarUrl).toMatch(/^https:\/\/www\.gravatar\.com\/avatar\/[a-f0-9]{32}\?d=mp$/)
    expect(s3Mocks.deleteAvatar).toHaveBeenCalledWith(`avatars/${uid}/old.webp`)
    expect(authMocks.updateAuthUserAvatar).toHaveBeenCalledWith(uid, null, expect.anything())
  })
})
