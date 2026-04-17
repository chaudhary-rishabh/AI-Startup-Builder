import { beforeEach, describe, expect, it } from 'vitest'

import { useUIStore } from '@/store/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarCollapsed: false,
      contextPanelOpen: false,
      toasts: [],
      tokenWarning: null,
    })
  })

  it('addToast() adds toast with generated UUID id', () => {
    useUIStore.getState().addToast({ type: 'info', title: 'x' })
    const toast = useUIStore.getState().toasts[0]
    expect(toast?.id).toBeDefined()
    expect(toast?.title).toBe('x')
  })

  it('removeToast(id) removes only that toast', () => {
    useUIStore.getState().addToast({ type: 'info', title: 'a' })
    useUIStore.getState().addToast({ type: 'info', title: 'b' })
    const [first] = useUIStore.getState().toasts
    if (!first) {
      throw new Error('Expected a toast to exist')
    }
    useUIStore.getState().removeToast(first.id)
    expect(useUIStore.getState().toasts).toHaveLength(1)
    expect(useUIStore.getState().toasts[0]?.title).toBe('b')
  })

  it('clearToasts() empties array', () => {
    useUIStore.getState().addToast({ type: 'info', title: 'a' })
    useUIStore.getState().clearToasts()
    expect(useUIStore.getState().toasts).toHaveLength(0)
  })

  it('setTokenWarning(warning) sets tokenWarning', () => {
    useUIStore.getState().setTokenWarning({
      percentUsed: 80,
      tokensRemaining: 100,
      resetDate: 'May 1',
    })
    expect(useUIStore.getState().tokenWarning?.percentUsed).toBe(80)
  })

  it('setTokenWarning(null) clears warning', () => {
    useUIStore.getState().setTokenWarning({
      percentUsed: 95,
      tokensRemaining: 10,
      resetDate: 'May 1',
    })
    useUIStore.getState().setTokenWarning(null)
    expect(useUIStore.getState().tokenWarning).toBeNull()
  })

  it('setSidebarCollapsed / toggleSidebar work correctly', () => {
    useUIStore.getState().setSidebarCollapsed(true)
    expect(useUIStore.getState().sidebarCollapsed).toBe(true)
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarCollapsed).toBe(false)
  })
})
