import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useAgentStream } from '@/hooks/useAgentStream'
import { useUIStore } from '@/store/uiStore'
import { MockEventSource } from '@/tests/mocks/mockEventSource'

describe('useAgentStream', () => {
  it('opens EventSource with withCredentials true', () => {
    const { result } = renderHook(() => useAgentStream({}))
    act(() => {
      result.current.start('run-1')
    })
    const es = MockEventSource.instances[0]
    expect(es).toBeDefined()
    expect(es?.withCredentials).toBe(true)
  })

  it('fires onToken callback for token events', () => {
    const onToken = vi.fn()
    const { result } = renderHook(() => useAgentStream({ onToken }))
    act(() => {
      result.current.start('run-1')
    })
    const es = MockEventSource.instances[0]
    act(() => {
      es?.dispatchEvent('token', { type: 'token', token: 'Hello ', runId: 'run-1' })
    })
    expect(onToken).toHaveBeenCalledWith(expect.objectContaining({ token: 'Hello ' }))
  })

  it('fires onDocMode for doc_mode event', () => {
    const onDocMode = vi.fn()
    const { result } = renderHook(() => useAgentStream({ onDocMode }))
    act(() => {
      result.current.start('run-1')
    })
    act(() => {
      MockEventSource.instances[0]?.dispatchEvent('doc_mode', {
        type: 'doc_mode',
        mode: 'direct',
        docCount: 2,
        tokenCount: 24000,
        runId: 'run-1',
      })
    })
    expect(onDocMode).toHaveBeenCalledWith(expect.objectContaining({ mode: 'direct', docCount: 2 }))
  })

  it('maps done event to run_complete', () => {
    const onRunComplete = vi.fn()
    const { result } = renderHook(() => useAgentStream({ onRunComplete }))
    act(() => {
      result.current.start('run-1')
    })
    act(() => {
      MockEventSource.instances[0]?.dispatchEvent('done', {
        runId: 'run-1',
        tokensUsed: 1842,
        durationMs: 8000,
        output: {},
      })
    })
    expect(onRunComplete).toHaveBeenCalledWith(expect.objectContaining({ type: 'run_complete' }))
  })

  it('stops streaming after done event', () => {
    const { result } = renderHook(() => useAgentStream({}))
    act(() => {
      result.current.start('run-1')
    })
    expect(result.current.isStreaming).toBe(true)
    act(() => {
      MockEventSource.instances[0]?.dispatchEvent('done', {
        runId: 'run-1',
        tokensUsed: 0,
        durationMs: 0,
        output: {},
      })
    })
    expect(result.current.isStreaming).toBe(false)
  })

  it('does not fire onError for CONNECTING state (auto-reconnect)', () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useAgentStream({ onError }))
    act(() => {
      result.current.start('run-1')
    })
    const es = MockEventSource.instances[0]
    act(() => {
      es?.simulateError(MockEventSource.CONNECTING)
    })
    expect(onError).not.toHaveBeenCalled()
  })

  it('fires onError when readyState is CLOSED', () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useAgentStream({ onError }))
    act(() => {
      result.current.start('run-1')
    })
    act(() => {
      MockEventSource.instances[0]?.simulateError(MockEventSource.CLOSED)
    })
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'CONNECTION_LOST' }))
  })

  it('token.budget.warning updates uiStore via getState', () => {
    const { result } = renderHook(() => useAgentStream({}))
    act(() => {
      result.current.start('run-1')
    })
    act(() => {
      MockEventSource.instances[0]?.dispatchEvent('token.budget.warning', {
        type: 'token.budget.warning',
        percentUsed: 80,
        tokensUsed: 40000,
        tokenLimit: 50000,
        runId: 'run-1',
      })
    })
    const { tokenWarning } = useUIStore.getState()
    expect(tokenWarning).not.toBeNull()
    expect(tokenWarning?.percentUsed).toBe(80)
  })

  it('cleans up EventSource on unmount', () => {
    const { result, unmount } = renderHook(() => useAgentStream({}))
    act(() => {
      result.current.start('run-1')
    })
    const es = MockEventSource.instances[0]
    unmount()
    expect(es?.readyState).toBe(MockEventSource.CLOSED)
  })

  it('callbacks ref pattern: updated callback used without recreating EventSource', () => {
    let callCount = 0
    const callbacks = { onToken: () => {
      callCount += 1
    } }
    const { result, rerender } = renderHook((cb) => useAgentStream(cb), { initialProps: callbacks })
    act(() => {
      result.current.start('run-1')
    })
    const es1 = MockEventSource.instances[0]

    callbacks.onToken = () => {
      callCount += 10
    }
    rerender(callbacks)

    expect(MockEventSource.instances).toHaveLength(1)

    act(() => {
      es1?.dispatchEvent('token', { type: 'token', token: 'x', runId: 'run-1' })
    })
    expect(callCount).toBe(10)
  })
})
