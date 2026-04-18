'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface CanvasScreen {
  screenName: string
  html: string
  route: string
  generatedAt: string
}

interface CanvasState {
  screens: CanvasScreen[]
  selectedScreen: string | null
  addScreen: (screen: CanvasScreen) => void
  removeScreen: (screenName: string) => void
  setSelectedScreen: (name: string | null) => void
  clearScreens: () => void
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    immer((set) => ({
      screens: [],
      selectedScreen: null,
      addScreen: (screen) =>
        set((draft) => {
          const existingIndex = draft.screens.findIndex((item) => item.screenName === screen.screenName)
          if (existingIndex >= 0) {
            draft.screens[existingIndex] = screen
          } else {
            draft.screens.push(screen)
          }
          draft.selectedScreen = screen.screenName
        }),
      removeScreen: (screenName) =>
        set((draft) => {
          draft.screens = draft.screens.filter((item) => item.screenName !== screenName)
          if (draft.selectedScreen === screenName) {
            const next = draft.screens[0]?.screenName ?? null
            draft.selectedScreen = next
          }
        }),
      setSelectedScreen: (name) =>
        set((draft) => {
          draft.selectedScreen = name
        }),
      clearScreens: () =>
        set((draft) => {
          draft.screens = []
          draft.selectedScreen = null
        }),
    })),
    {
      name: 'canvas-store',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return sessionStorage
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      }),
      partialize: (state) => ({
        screens: state.screens,
        selectedScreen: state.selectedScreen,
      }),
    },
  ),
)
