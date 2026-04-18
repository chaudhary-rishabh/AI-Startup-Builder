import { describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/authStore'

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
  role: 'user' as const,
  plan: 'pro' as const,
  onboardingDone: true,
}

describe('authStore', () => {
  describe('setUser', () => {
    it('sets user and marks authenticated', () => {
      useAuthStore.getState().setUser(mockUser)
      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.isAuthenticated).toBe(true)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('clearAuth', () => {
    it('nulls user and clears authentication', () => {
      useAuthStore.getState().setUser(mockUser)
      useAuthStore.getState().clearAuth()
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('updatePlan', () => {
    it('updates plan when user is set', () => {
      useAuthStore.getState().setUser(mockUser)
      useAuthStore.getState().updatePlan('team')
      expect(useAuthStore.getState().user?.plan).toBe('team')
    })

    it('does nothing when user is null', () => {
      expect(() => useAuthStore.getState().updatePlan('pro')).not.toThrow()
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe('setLoading', () => {
    it('toggles isLoading', () => {
      useAuthStore.getState().setLoading(true)
      expect(useAuthStore.getState().isLoading).toBe(true)
      useAuthStore.getState().setLoading(false)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('persistence', () => {
    it('persists user to localStorage', () => {
      useAuthStore.getState().setUser(mockUser)
      expect(window.localStorage.setItem).toHaveBeenCalled()
      const raw = window.localStorage.getItem('auth-store')
      expect(raw).toBeTruthy()
      expect(raw).toContain('user-1')
    })

    it('does not persist isLoading', () => {
      expect(useAuthStore.getState().isLoading).toBeDefined()
      useAuthStore.getState().setLoading(true)
      const raw = window.localStorage.getItem('auth-store')
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw as string) as { state?: { isLoading?: boolean } }
      const stateObj = parsed?.state ?? parsed
      expect(stateObj).not.toHaveProperty('isLoading')
    })
  })
})
