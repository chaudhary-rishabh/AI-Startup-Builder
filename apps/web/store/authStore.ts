'use client'

import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'
import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  role: 'user' | 'admin' | 'super_admin'
  plan: 'free' | 'pro' | 'team' | 'enterprise'
  onboardingDone: boolean
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: AuthUser) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
  updatePlan: (plan: AuthUser['plan']) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: (user) =>
        set((state) => {
          state.user = user
          state.isAuthenticated = true
          state.isLoading = false
        }),
      clearAuth: () =>
        set((state) => {
          state.user = null
          state.isAuthenticated = false
          state.isLoading = false
        }),
      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading
        }),
      updatePlan: (plan) =>
        set((state) => {
          if (state.user) {
            state.user.plan = plan
          }
        }),
    })),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
)
