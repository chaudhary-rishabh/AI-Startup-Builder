'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number
}

interface TokenWarning {
  percentUsed: 80 | 95
  tokensRemaining: number
  resetDate: string
}

interface UIState {
  sidebarCollapsed: boolean
  contextPanelOpen: boolean
  toasts: Toast[]
  tokenWarning: TokenWarning | null
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setContextPanelOpen: (open: boolean) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  setTokenWarning: (warning: TokenWarning | null) => void
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    sidebarCollapsed: false,
    contextPanelOpen: false,
    toasts: [],
    tokenWarning: null,
    setSidebarCollapsed: (collapsed) =>
      set((state) => {
        state.sidebarCollapsed = collapsed
      }),
    toggleSidebar: () =>
      set((state) => {
        state.sidebarCollapsed = !state.sidebarCollapsed
      }),
    setContextPanelOpen: (open) =>
      set((state) => {
        state.contextPanelOpen = open
      }),
    addToast: (toast) =>
      set((state) => {
        state.toasts.push({
          id: crypto.randomUUID(),
          duration: toast.duration ?? 4000,
          ...toast,
        })
      }),
    removeToast: (id) =>
      set((state) => {
        state.toasts = state.toasts.filter((toast) => toast.id !== id)
      }),
    clearToasts: () =>
      set((state) => {
        state.toasts = []
      }),
    setTokenWarning: (warning) =>
      set((state) => {
        state.tokenWarning = warning
      }),
  })),
)
