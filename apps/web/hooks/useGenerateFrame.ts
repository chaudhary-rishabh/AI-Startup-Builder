'use client'

import { useCallback, useRef } from 'react'

import { useAgentRun } from '@/hooks/useAgentRun'
import { useCanvasStore } from '@/store/canvasStore'

interface UseGenerateFrameOptions {
  projectId: string
}

interface GenerateFrameArgs {
  screenName: string
  route: string
}

interface UseGenerateFrameReturn {
  status: 'idle' | 'starting' | 'connected' | 'running' | 'complete' | 'error'
  isGenerating: boolean
  streamedText: string
  tokensUsed: number
  generateFrame: (args: GenerateFrameArgs) => Promise<void>
  cancel: () => Promise<void>
}

export function useGenerateFrame(options: UseGenerateFrameOptions): UseGenerateFrameReturn {
  const addScreen = useCanvasStore((state) => state.addScreen)
  const pendingScreenRef = useRef<GenerateFrameArgs | null>(null)

  const run = useAgentRun({
    projectId: options.projectId,
    agentType: 'uiux',
    phase: 3,
    onComplete: (output) => {
      if (!pendingScreenRef.current) return
      const html = (output as { html?: string }).html ?? ''
      addScreen({
        screenName: pendingScreenRef.current.screenName,
        html,
        route: pendingScreenRef.current.route,
        generatedAt: new Date().toISOString(),
      })
    },
  })

  const generateFrame = useCallback(async (args: GenerateFrameArgs): Promise<void> => {
    pendingScreenRef.current = args
    await run.trigger()
  }, [run])

  return {
    status: run.status,
    isGenerating: run.status === 'starting' || run.status === 'connected' || run.status === 'running',
    streamedText: run.streamedText,
    tokensUsed: run.tokensUsed,
    generateFrame,
    cancel: run.cancel,
  }
}
