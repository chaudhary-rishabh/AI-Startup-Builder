'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useUIStore } from '@/store/uiStore'
import type {
  SSEBatchCompleteEvent,
  SSEBatchStartEvent,
  SSECrossCheckEvent,
  SSEDocModeEvent,
  SSEErrorEvent,
  SSEFileCompleteEvent,
  SSEFileStartEvent,
  SSERunCompleteEvent,
  SSERunStartEvent,
  SSETokenBudgetWarningEvent,
  SSETokenEvent,
} from '@/types'

export interface AgentStreamCallbacks {
  onRunStart?: (event: SSERunStartEvent) => void
  onDocMode?: (event: SSEDocModeEvent) => void
  onToken?: (event: SSETokenEvent) => void
  onCrossCheck?: (event: SSECrossCheckEvent) => void
  onFileStart?: (event: SSEFileStartEvent) => void
  onFileComplete?: (event: SSEFileCompleteEvent) => void
  onBatchStart?: (event: SSEBatchStartEvent) => void
  onBatchComplete?: (event: SSEBatchCompleteEvent) => void
  onRunComplete?: (event: SSERunCompleteEvent) => void
  onError?: (event: SSEErrorEvent) => void
  onTokenBudgetWarning?: (event: SSETokenBudgetWarningEvent) => void
  onHeartbeat?: () => void
}

export interface UseAgentStreamReturn {
  isStreaming: boolean
  isConnected: boolean
  start: (runId: string) => void
  stop: () => void
}

function getFirstOfNextMonth(): string {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth() + 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function useAgentStream(callbacks: AgentStreamCallbacks): UseAgentStreamReturn {
  const esRef = useRef<EventSource | null>(null)
  const callbacksRef = useRef(callbacks)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const handledDoneRef = useRef(false)

  useEffect(() => {
    callbacksRef.current = callbacks
  })

  const stop = useCallback((): void => {
    esRef.current?.close()
    esRef.current = null
    setIsStreaming(false)
    setIsConnected(false)
  }, [])

  const start = useCallback(
    (runId: string): void => {
      stop()
      handledDoneRef.current = false
      setIsStreaming(true)

      const base = process.env.NEXT_PUBLIC_API_URL ?? ''
      const url = `${base}/ai/runs/${runId}/stream`
      const es = new EventSource(url, { withCredentials: true })
      esRef.current = es

      const parseData = (rawData: string): Record<string, unknown> | null => {
        try {
          return JSON.parse(rawData) as Record<string, unknown>
        } catch {
          // eslint-disable-next-line no-console
          console.warn('useAgentStream: failed to parse SSE data', rawData)
          return null
        }
      }

      es.onopen = () => {
        setIsConnected(true)
      }

      es.addEventListener('run_start', (event) => {
        const data = parseData((event as MessageEvent).data)
        if (data) callbacksRef.current.onRunStart?.(data as unknown as SSERunStartEvent)
      })
      es.addEventListener('doc_mode', (event) => {
        const data = parseData((event as MessageEvent).data)
        if (data) callbacksRef.current.onDocMode?.(data as unknown as SSEDocModeEvent)
      })
      es.addEventListener('token', (event) => {
        const data = parseData((event as MessageEvent).data)
        if (data) callbacksRef.current.onToken?.(data as unknown as SSETokenEvent)
      })
      es.addEventListener('cross_check', (event) => {
        const data = parseData((event as MessageEvent).data)
        if (data) callbacksRef.current.onCrossCheck?.(data as unknown as SSECrossCheckEvent)
      })
      es.addEventListener('file_start', (event) => {
        const data = parseData((event as MessageEvent).data)
        if (data) callbacksRef.current.onFileStart?.(data as unknown as SSEFileStartEvent)
      })
      es.addEventListener('file_complete', (event) => {
        const data = parseData((event as MessageEvent).data)
        if (data) callbacksRef.current.onFileComplete?.(data as unknown as SSEFileCompleteEvent)
      })
      es.addEventListener('batch_start', (event) => {
        const data = parseData((event as MessageEvent).data)
        if (data) callbacksRef.current.onBatchStart?.(data as unknown as SSEBatchStartEvent)
      })
      es.addEventListener('batch_complete', (event) => {
        const data = parseData((event as MessageEvent).data)
        if (data) callbacksRef.current.onBatchComplete?.(data as unknown as SSEBatchCompleteEvent)
      })

      const handleCompletion = (data: Record<string, unknown>): void => {
        if (handledDoneRef.current) return
        handledDoneRef.current = true
        callbacksRef.current.onRunComplete?.({
          ...(data as object),
          type: 'run_complete',
        } as SSERunCompleteEvent)
        stop()
      }

      es.addEventListener('done', (event) => {
        const data = parseData((event as MessageEvent).data)
        if (data) handleCompletion(data)
      })
      es.addEventListener('run_complete', (event) => {
        const data = parseData((event as MessageEvent).data)
        if (data) handleCompletion(data)
      })

      es.addEventListener('error', (event) => {
        const data = parseData((event as MessageEvent).data)
        if (data) callbacksRef.current.onError?.(data as unknown as SSEErrorEvent)
        stop()
      })

      es.addEventListener('token.budget.warning', (event) => {
        const data = parseData((event as MessageEvent).data)
        if (!data) return
        const warning = data as unknown as SSETokenBudgetWarningEvent
        callbacksRef.current.onTokenBudgetWarning?.(warning)
        useUIStore.getState().setTokenWarning({
          percentUsed: warning.percentUsed,
          tokensRemaining: warning.tokenLimit - warning.tokensUsed,
          resetDate: getFirstOfNextMonth(),
        })
      })

      es.addEventListener('heartbeat', () => {
        callbacksRef.current.onHeartbeat?.()
      })

      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) {
          callbacksRef.current.onError?.({
            type: 'error',
            code: 'CONNECTION_LOST',
            message: 'Connection to AI stream was lost.',
            runId: '',
          })
          stop()
        }
      }
    },
    [stop],
  )

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return { isStreaming, isConnected, start, stop }
}
