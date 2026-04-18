import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useGenerateFrame } from '@/hooks/useGenerateFrame'
import { useCanvasStore } from '@/store/canvasStore'

vi.mock('@/hooks/useAgentRun', () => ({
  useAgentRun: ({ onComplete }: { onComplete?: (output: Record<string, unknown>) => void }) => ({
    status: 'idle',
    streamedText: '',
    tokensUsed: 0,
    cancel: vi.fn(),
    trigger: vi.fn(async () => {
      onComplete?.({ html: '<main>Dashboard</main>' })
    }),
  }),
}))

describe('useGenerateFrame', () => {
  beforeEach(() => {
    useCanvasStore.setState({ screens: [], selectedScreen: null })
  })

  it('maps output.html to addScreen payload', async () => {
    const addScreenSpy = vi.spyOn(useCanvasStore.getState(), 'addScreen')
    const { result } = renderHook(() => useGenerateFrame({ projectId: 'proj-1' }))

    await act(async () => {
      await result.current.generateFrame({ screenName: 'Dashboard', route: '/dashboard' })
    })

    expect(addScreenSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        screenName: 'Dashboard',
        html: expect.any(String),
        route: '/dashboard',
      }),
    )
  })
})
