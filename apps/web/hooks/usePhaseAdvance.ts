'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import { advancePhase, getPhaseRoute } from '@/api/projects.api'
import type { BuildMode } from '@/types'

export interface UsePhaseAdvanceOptions {
  projectId: string
  currentPhase: number
  buildMode: BuildMode
  allAgentsComplete: boolean
  copilotAnswered?: boolean
}

export interface UsePhaseAdvanceReturn {
  canAdvance: boolean
  showCopilotCard: boolean
  isAdvancing: boolean
  advance: () => Promise<void>
}

export function usePhaseAdvance(options: UsePhaseAdvanceOptions): UsePhaseAdvanceReturn {
  const router = useRouter()
  const queryClient = useQueryClient()

  const canAdvance =
    options.buildMode === 'copilot'
      ? options.allAgentsComplete && Boolean(options.copilotAnswered)
      : options.allAgentsComplete

  const showCopilotCard =
    options.buildMode === 'copilot' && options.allAgentsComplete && !Boolean(options.copilotAnswered)

  const mutation = useMutation({
    mutationFn: async () => advancePhase(options.projectId, options.currentPhase + 1),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project', options.projectId] })
      router.push(getPhaseRoute(options.projectId, options.currentPhase + 1))
    },
  })

  const advance = async (): Promise<void> => {
    if (!canAdvance || mutation.isPending) return
    await mutation.mutateAsync()
  }

  return {
    canAdvance,
    showCopilotCard,
    isAdvancing: mutation.isPending,
    advance,
  }
}
