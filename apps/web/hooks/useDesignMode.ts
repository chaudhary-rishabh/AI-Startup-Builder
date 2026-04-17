'use client'

import { useCallback } from 'react'

import { useProjectStore } from '@/store/projectStore'

export function useDesignMode() {
  const mode = useProjectStore((state) => state.mode)
  const setMode = useProjectStore((state) => state.setMode)
  const isModeTransitioning = useProjectStore((state) => state.isModeTransitioning)

  const switchToDesign = useCallback(() => {
    if (mode !== 'design') setMode('design')
  }, [mode, setMode])

  const switchToDev = useCallback(() => {
    if (mode !== 'dev') setMode('dev')
  }, [mode, setMode])

  return {
    mode,
    isDesign: mode === 'design',
    isDev: mode === 'dev',
    isModeTransitioning,
    switchToDesign,
    switchToDev,
  }
}
