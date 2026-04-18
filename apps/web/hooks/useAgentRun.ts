'use client'

import { useState } from 'react'

import { cancelAgentRun, startAgentRun } from '@/api/agents.api'
import { useAgentStream } from '@/hooks/useAgentStream'
import type {
  SSECrossCheckEvent,
  SSEBatchCompleteEvent,
  SSEBatchStartEvent,
  SSEDocModeEvent,
  SSEFileCompleteEvent,
  SSEFileStartEvent,
  SSETokenEvent,
} from '@/types'

export interface UseAgentRunOptions {
  projectId: string
  agentType: string
  phase: number
  userMessage?: string
  onComplete?: (output: Record<string, unknown>) => void
  onError?: (code: string, message: string) => void
  onToken?: (event: SSETokenEvent) => void
  onFileStart?: (event: SSEFileStartEvent) => void
  onFileComplete?: (event: SSEFileCompleteEvent) => void
  onBatchStart?: (event: SSEBatchStartEvent) => void
  onBatchComplete?: (event: SSEBatchCompleteEvent) => void
}

export type AgentRunStatus = 'idle' | 'starting' | 'connected' | 'running' | 'complete' | 'error'

export interface UseAgentRunReturn {
  status: AgentRunStatus
  runId: string | null
  streamedText: string
  docMode: SSEDocModeEvent | null
  crossChecks: SSECrossCheckEvent[]
  tokensUsed: number
  isStreaming: boolean
  trigger: () => Promise<void>
  cancel: () => Promise<void>
  reset: () => void
}

export function useAgentRun(options: UseAgentRunOptions): UseAgentRunReturn {
  const [status, setStatus] = useState<AgentRunStatus>('idle')
  const [runId, setRunId] = useState<string | null>(null)
  const [streamedText, setStreamedText] = useState('')
  const [docMode, setDocMode] = useState<SSEDocModeEvent | null>(null)
  const [crossChecks, setCrossChecks] = useState<SSECrossCheckEvent[]>([])
  const [tokensUsed, setTokensUsed] = useState(0)

  const { start: startStream, stop: stopStream, isStreaming } = useAgentStream({
    onRunStart: () => setStatus('running'),
    onDocMode: (event) => setDocMode(event),
    onToken: (event) => {
      setStreamedText((prev) => prev + event.token)
      options.onToken?.(event)
    },
    onCrossCheck: (event) => setCrossChecks((prev) => [...prev, event]),
    onFileStart: (event) => options.onFileStart?.(event),
    onFileComplete: (event) => options.onFileComplete?.(event),
    onBatchStart: (event) => options.onBatchStart?.(event),
    onBatchComplete: (event) => options.onBatchComplete?.(event),
    onRunComplete: (event) => {
      setTokensUsed(event.tokensUsed)
      setStatus('complete')
      options.onComplete?.(event.output)
    },
    onError: (event) => {
      setStatus('error')
      options.onError?.(event.code, event.message)
    },
  })

  const trigger = async (): Promise<void> => {
    if (status === 'running' || status === 'starting') return
    setStatus('starting')
    setStreamedText('')
    setDocMode(null)
    setCrossChecks([])
    setTokensUsed(0)
    try {
      const run = await startAgentRun({
        projectId: options.projectId,
        agentType: options.agentType,
        phase: options.phase,
        ...(options.userMessage ? { userMessage: options.userMessage } : {}),
      })
      setRunId(run.runId)
      setStatus('connected')
      startStream(run.runId)
    } catch (error) {
      const appError = error as { code?: string; message?: string }
      setStatus('error')
      options.onError?.(appError.code ?? 'START_FAILED', appError.message ?? 'Failed to start agent run.')
    }
  }

  const cancel = async (): Promise<void> => {
    if (!runId) return
    stopStream()
    try {
      await cancelAgentRun(runId)
    } finally {
      setStatus('idle')
    }
  }

  const reset = (): void => {
    stopStream()
    setStatus('idle')
    setRunId(null)
    setStreamedText('')
    setDocMode(null)
    setCrossChecks([])
    setTokensUsed(0)
  }

  return {
    status,
    runId,
    streamedText,
    docMode,
    crossChecks,
    tokensUsed,
    isStreaming,
    trigger,
    cancel,
    reset,
  }
}
