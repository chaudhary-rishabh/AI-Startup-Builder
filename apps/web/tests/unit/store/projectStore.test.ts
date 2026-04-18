import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useProjectStore } from '@/store/projectStore'

describe('projectStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useProjectStore.setState({
      activeProjectId: null,
      currentPhase: 1,
      mode: 'design',
      buildMode: 'copilot',
      isModeTransitioning: false,
      designTokens: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('buildMode', () => {
    it('defaults to copilot', () => {
      expect(useProjectStore.getState().buildMode).toBe('copilot')
    })

    it('setBuildMode updates buildMode', () => {
      useProjectStore.getState().setBuildMode('autopilot')
      expect(useProjectStore.getState().buildMode).toBe('autopilot')
    })
  })

  describe('setMode', () => {
    it('sets isModeTransitioning true then resets after 400ms', () => {
      useProjectStore.getState().setMode('dev')
      expect(useProjectStore.getState().isModeTransitioning).toBe(true)
      expect(useProjectStore.getState().mode).toBe('dev')
      vi.advanceTimersByTime(400)
      expect(useProjectStore.getState().isModeTransitioning).toBe(false)
    })
  })

  describe('setActiveProject', () => {
    it('sets activeProjectId and currentPhase', () => {
      useProjectStore.getState().setActiveProject('proj-abc', 3)
      const state = useProjectStore.getState()
      expect(state.activeProjectId).toBe('proj-abc')
      expect(state.currentPhase).toBe(3)
    })

    it('defaults phase to 1 when not provided', () => {
      useProjectStore.getState().setActiveProject('proj-abc')
      expect(useProjectStore.getState().currentPhase).toBe(1)
    })
  })

  describe('designTokens', () => {
    it('defaults to null', () => {
      expect(useProjectStore.getState().designTokens).toBeNull()
    })

    it('setDesignTokens stores tokens', () => {
      const tokens = {
        primaryColor: '#7C3AED',
        backgroundColor: '#F5F0E8',
        fontFamily: 'Inter',
        borderRadius: '8px',
        spacing: '4px',
      }
      useProjectStore.getState().setDesignTokens(tokens)
      expect(useProjectStore.getState().designTokens).toEqual(tokens)
    })
  })

  describe('clearProject', () => {
    it('resets to initial state', () => {
      useProjectStore.getState().setActiveProject('proj-1', 4)
      useProjectStore.getState().setBuildMode('manual')
      useProjectStore.getState().clearProject()
      const state = useProjectStore.getState()
      expect(state.activeProjectId).toBeNull()
      expect(state.currentPhase).toBe(1)
    })
  })
})
