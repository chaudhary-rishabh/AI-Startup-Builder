import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('authClient.service', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { valid: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.resetModules()
  })

  it('getAuthUser returns null on 404', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 404 }))
    const mod = await import('../../src/services/authClient.service.js')
    await expect(mod.getAuthUser('u1')).resolves.toBeNull()
  })

  it('getAuthUser returns user on 200', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
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
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const mod = await import('../../src/services/authClient.service.js')
    const u = await mod.getAuthUser('u1', 'req-1')
    expect(u?.email).toBe('a@b.com')
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/internal/users/u1'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Request-ID': 'req-1' }),
      }),
    )
  })

  it('getAuthUser throws on non-2xx non-404', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }))
    const mod = await import('../../src/services/authClient.service.js')
    await expect(mod.getAuthUser('u1')).rejects.toThrow()
  })

  it('verifyPassword returns valid flag', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { valid: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const mod = await import('../../src/services/authClient.service.js')
    await expect(mod.verifyPassword('u1', 'pw')).resolves.toBe(true)
  })

  it('softDeleteAuthUser, completeAuthOnboarding, patchAuthUserFullName call fetch', async () => {
    const mod = await import('../../src/services/authClient.service.js')
    await mod.softDeleteAuthUser('u1')
    await mod.completeAuthOnboarding('u1')
    await mod.patchAuthUserFullName('u1', 'New Name')
    expect(fetchSpy).toHaveBeenCalled()
  })

  it('updateAuthUserAvatar POSTs to internal update-avatar', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { updated: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const mod = await import('../../src/services/authClient.service.js')
    await mod.updateAuthUserAvatar('u1', 'https://cdn.example/a.png', 'rid')
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/internal/users/u1/update-avatar'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ avatarUrl: 'https://cdn.example/a.png' }),
      }),
    )
  })
})
