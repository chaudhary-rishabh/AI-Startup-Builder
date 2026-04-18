'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { DesignTokens } from '@/types'

interface ProjectState {
  activeProjectId: string | null
  currentPhase: number
  mode: 'design' | 'dev'
  buildMode: 'autopilot' | 'copilot' | 'manual'
  designTokens: DesignTokens | null
  isModeTransitioning: boolean
  setActiveProject: (id: string, phase?: number) => void
  setCurrentPhase: (phase: number) => void
  setMode: (mode: 'design' | 'dev') => void
  setBuildMode: (mode: 'autopilot' | 'copilot' | 'manual') => void
  setDesignTokens: (tokens: DesignTokens) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    immer((set) => ({
      activeProjectId: null,
      currentPhase: 1,
      mode: 'design',
      buildMode: 'copilot',
      designTokens: null,
      isModeTransitioning: false,
      setActiveProject: (id, phase) =>
        set((state) => {
          state.activeProjectId = id
          if (phase !== undefined) {
            state.currentPhase = phase
          }
        }),
      setCurrentPhase: (phase) =>
        set((state) => {
          state.currentPhase = phase
        }),
      setMode: (mode) => {
        set((state) => {
          state.mode = mode
          state.isModeTransitioning = true
        })
        setTimeout(() => {
          set((state) => {
            state.isModeTransitioning = false
          })
        }, 400)
      },
      setBuildMode: (mode) =>
        set((state) => {
          state.buildMode = mode
        }),
      setDesignTokens: (tokens) => {
        set((state) => {
          state.designTokens = tokens
        })
        if (typeof document !== 'undefined') {
          const root = document.documentElement
          root.style.setProperty('--project-primary', tokens.primaryColor)
          root.style.setProperty('--project-bg', tokens.backgroundColor)
          root.style.setProperty('--project-font', tokens.fontFamily)
          root.style.setProperty('--project-radius', tokens.borderRadius)
        }
      },
      clearProject: () =>
        set((state) => {
          state.activeProjectId = null
          state.currentPhase = 1
          state.mode = 'design'
          state.buildMode = 'copilot'
          state.designTokens = null
          state.isModeTransitioning = false
        }),
    })),
    {
      name: 'project-store',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        activeProjectId: state.activeProjectId,
        currentPhase: state.currentPhase,
        mode: state.mode,
        buildMode: state.buildMode,
        designTokens: state.designTokens,
      }),
    },
  ),
)
