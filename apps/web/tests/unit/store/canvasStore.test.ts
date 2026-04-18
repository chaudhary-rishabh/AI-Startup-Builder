import { beforeEach, describe, expect, it } from 'vitest'

import { useCanvasStore } from '@/store/canvasStore'

describe('canvasStore', () => {
  beforeEach(() => {
    useCanvasStore.setState({ screens: [], selectedScreen: null })
  })

  it('adds screen and selects it', () => {
    useCanvasStore.getState().addScreen({
      screenName: 'Dashboard',
      html: '<html></html>',
      route: '/dashboard',
      generatedAt: '2026-01-01T00:00:00.000Z',
    })

    const state = useCanvasStore.getState()
    expect(state.screens).toHaveLength(1)
    expect(state.selectedScreen).toBe('Dashboard')
  })

  it('replaces duplicate screenName instead of appending', () => {
    useCanvasStore.getState().addScreen({
      screenName: 'Dashboard',
      html: '<html>v1</html>',
      route: '/dashboard',
      generatedAt: '2026-01-01T00:00:00.000Z',
    })
    useCanvasStore.getState().addScreen({
      screenName: 'Dashboard',
      html: '<html>v2</html>',
      route: '/dashboard',
      generatedAt: '2026-01-02T00:00:00.000Z',
    })

    const state = useCanvasStore.getState()
    expect(state.screens).toHaveLength(1)
    expect(state.screens[0]?.html).toContain('v2')
  })

  it('removeScreen updates selectedScreen safely', () => {
    const store = useCanvasStore.getState()
    store.addScreen({
      screenName: 'Dashboard',
      html: '<html>dashboard</html>',
      route: '/dashboard',
      generatedAt: '2026-01-01T00:00:00.000Z',
    })
    store.addScreen({
      screenName: 'Settings',
      html: '<html>settings</html>',
      route: '/settings',
      generatedAt: '2026-01-01T00:00:00.000Z',
    })
    store.setSelectedScreen('Settings')
    store.removeScreen('Settings')
    expect(useCanvasStore.getState().selectedScreen).toBe('Dashboard')
    store.removeScreen('Dashboard')
    expect(useCanvasStore.getState().selectedScreen).toBeNull()
  })

  it('clearScreens resets screens and selection', () => {
    useCanvasStore.getState().addScreen({
      screenName: 'Dashboard',
      html: '<html></html>',
      route: '/dashboard',
      generatedAt: '2026-01-01T00:00:00.000Z',
    })
    useCanvasStore.getState().clearScreens()
    expect(useCanvasStore.getState().screens).toHaveLength(0)
    expect(useCanvasStore.getState().selectedScreen).toBeNull()
  })
})
