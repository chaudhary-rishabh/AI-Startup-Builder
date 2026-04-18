import { describe, it, expect, vi } from 'vitest'
import { useAdminAuthStore } from '@/store/adminAuthStore'

const mockAdmin = {
  id: 'admin-1',
  email: 'admin@test.com',
  name: 'Admin User',
  role: 'super_admin' as const,
  avatarUrl: null,
  lastLoginAt: null,
}

describe('adminAuthStore', () => {
  it('setAdmin marks isAuthenticated true', () => {
    useAdminAuthStore.getState().setAdmin(mockAdmin)
    expect(useAdminAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAdminAuthStore.getState().admin?.name).toBe('Admin User')
  })

  it('clearAuth nulls admin and isAuthenticated', () => {
    useAdminAuthStore.getState().setAdmin(mockAdmin)
    useAdminAuthStore.getState().clearAuth()
    expect(useAdminAuthStore.getState().admin).toBeNull()
    expect(useAdminAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('isLoading not persisted in localStorage', () => {
    useAdminAuthStore.getState().setLoading(true)
    const calls = (window.localStorage.setItem as ReturnType<typeof vi.fn>).mock
      .calls
    const last = calls[calls.length - 1]
    if (last) {
      const stored = JSON.parse(last[1] as string)
      expect((stored?.state ?? stored)).not.toHaveProperty('isLoading')
    }
  })
})
