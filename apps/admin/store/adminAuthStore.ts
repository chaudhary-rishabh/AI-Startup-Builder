import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { AdminAuthState } from '@/types'

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    immer((set) => ({
      admin: null,
      isAuthenticated: false,
      isLoading: false,

      setAdmin: (admin) =>
        set((state) => {
          state.admin = admin
          state.isAuthenticated = true
          state.isLoading = false
        }),

      clearAuth: () =>
        set((state) => {
          state.admin = null
          state.isAuthenticated = false
        }),

      setLoading: (v) =>
        set((state) => {
          state.isLoading = v
        }),
    })),
    {
      name: 'admin-auth-store',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : ({
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
              clear: () => {},
              key: () => null,
              get length() {
                return 0
              },
            } as unknown as Storage),
      ),
      partialize: (state) => ({
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
