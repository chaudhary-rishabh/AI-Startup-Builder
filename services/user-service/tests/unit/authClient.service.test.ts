import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('authClient.service', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { id: 'u1', valid: true } }),
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getAuthUser returns null on 404', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response)

    const mod = await import('../../src/services/authClient.service.js')
    await expect(mod.getAuthUser('u1')).resolves.toBeNull()
  })

  it('getAuthUser returns user on 200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          id: 'u1',
          email: 'a@b.com',
          fullName: 'A',
          role: 'user',
          planTier: 'free',
          status: 'active',
          onboardingCompleted: false,
          createdAt: '2020-01-01T00:00:00.000Z',
          avatarUrl: null,
        },
      }),
    } as Response)

    const mod = await import('../../src/services/authClient.service.js')
    const u = await mod.getAuthUser('u1', 'req-1')
    expect(u?.email).toBe('a@b.com')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/internal/users/u1'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Request-ID': 'req-1' }),
      }),
    )
  })

  it('getAuthUser throws on non-2xx non-404', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response)

    const mod = await import('../../src/services/authClient.service.js')
    await expect(mod.getAuthUser('u1')).rejects.toThrow()
  })

  it('verifyPassword returns valid flag', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { valid: true } }),
    } as Response)

    const mod = await import('../../src/services/authClient.service.js')
    await expect(mod.verifyPassword('u1', 'pw')).resolves.toBe(true)
  })

  it('softDeleteAuthUser and completeAuthOnboarding call fetch', async () => {
    const mod = await import('../../src/services/authClient.service.js')
    await mod.softDeleteAuthUser('u1')
    await mod.completeAuthOnboarding('u1')
    await mod.patchAuthUserFullName('u1', 'New Name')
    expect(fetch).toHaveBeenCalled()
  })
})
