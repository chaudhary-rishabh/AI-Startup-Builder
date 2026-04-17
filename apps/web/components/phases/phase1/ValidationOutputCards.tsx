'use client'

import { useMemo, useState } from 'react'

import { useAgentRun } from '@/hooks/useAgentRun'
import { usePhaseAdvance } from '@/hooks/usePhaseAdvance'
import { CopilotQuestionCard } from '@/components/phases/CopilotQuestionCard'
import { CrossCheckBadge } from '@/components/phases/CrossCheckBadge'
import { DocModeIndicator } from '@/components/phases/DocModeIndicator'
import { OutputCard } from '@/components/phases/OutputCard'
import { CompetitorTable } from '@/components/phases/phase1/CompetitorTable'
import { ValidationScoreCircle } from '@/components/phases/phase1/ValidationScoreCircle'
import type { BuildMode, Phase1Output, SSECrossCheckEvent, SSEDocModeEvent } from '@/types'

interface ValidationOutputCardsProps {
  projectId: string
  buildMode: BuildMode
  existingOutput?: Phase1Output
  initialUserMessage?: string
  onStatusesChange?: (
    statuses: Array<{ agentType: string; label: string; status: 'idle' | 'running' | 'complete' | 'error'; tokenCount?: number }>,
  ) => void
}

type StatusRow = { agentType: string; label: string; status: 'idle' | 'running' | 'complete' | 'error'; tokenCount?: number }

export function ValidationOutputCards({
  projectId,
  buildMode,
  existingOutput,
  initialUserMessage,
  onStatusesChange,
}: ValidationOutputCardsProps): JSX.Element {
  const [ideaOutput, setIdeaOutput] = useState(existingOutput?.ideaAnalysis)
  const [marketOutput, setMarketOutput] = useState(existingOutput?.marketResearch)
  const [validationOutput, setValidationOutput] = useState(existingOutput?.validation)
  const [copilotAnswered, setCopilotAnswered] = useState(false)

  const ideaRun = useAgentRun({
    projectId,
    phase: 1,
    agentType: 'idea_analyzer',
    ...(initialUserMessage ? { userMessage: initialUserMessage } : {}),
    onComplete: (output) => {
      setIdeaOutput({
        problemStatement: String(output.problemStatement ?? ''),
        solution: String(output.solution ?? ''),
        icp: String(output.icp ?? ''),
      })
    },
  })
  const marketRun = useAgentRun({
    projectId,
    phase: 1,
    agentType: 'market_research',
    onComplete: (output) => {
      setMarketOutput({
        competitors: (output.competitors as Phase1Output['marketResearch'] extends infer T
          ? T extends { competitors: infer C }
            ? C
            : []
          : []) as never,
        marketGap: String(output.marketGap ?? ''),
        pricingSuggestion: String(output.pricingSuggestion ?? ''),
      })
    },
  })
  const validationRun = useAgentRun({
    projectId,
    phase: 1,
    agentType: 'validation',
    onComplete: (output) => {
      setValidationOutput({
        demandScore: Number(output.demandScore ?? 0),
        riskLevel: (String(output.riskLevel ?? 'Medium') as 'Low' | 'Medium' | 'High'),
        verdict: (String(output.verdict ?? 'Pivot') as 'Yes' | 'No' | 'Pivot'),
        reasoning: String(output.reasoning ?? ''),
      })
    },
  })

  const statuses = useMemo<StatusRow[]>(
    () => [
      { agentType: 'idea_analyzer', label: 'Idea Analyzer', status: ideaRun.status === 'running' ? 'running' : ideaRun.status === 'complete' ? 'complete' : ideaRun.status === 'error' ? 'error' : 'idle', tokenCount: ideaRun.tokensUsed },
      { agentType: 'market_research', label: 'Market Research', status: marketRun.status === 'running' ? 'running' : marketRun.status === 'complete' ? 'complete' : marketRun.status === 'error' ? 'error' : 'idle', tokenCount: marketRun.tokensUsed },
      { agentType: 'validation', label: 'Validation', status: validationRun.status === 'running' ? 'running' : validationRun.status === 'complete' ? 'complete' : validationRun.status === 'error' ? 'error' : 'idle', tokenCount: validationRun.tokensUsed },
    ],
    [ideaRun.status, ideaRun.tokensUsed, marketRun.status, marketRun.tokensUsed, validationRun.status, validationRun.tokensUsed],
  )

  if (onStatusesChange) onStatusesChange(statuses)

  const allCrossChecks: SSECrossCheckEvent[] = [...ideaRun.crossChecks, ...marketRun.crossChecks, ...validationRun.crossChecks]
  const activeDocMode: SSEDocModeEvent | null = validationRun.docMode ?? marketRun.docMode ?? ideaRun.docMode

  const allAgentsComplete =
    (existingOutput?.ideaAnalysis ? true : ideaRun.status === 'complete') &&
    (existingOutput?.marketResearch ? true : marketRun.status === 'complete') &&
    (existingOutput?.validation ? true : validationRun.status === 'complete')

  const phaseAdvance = usePhaseAdvance({
    projectId,
    currentPhase: 1,
    buildMode,
    allAgentsComplete,
    copilotAnswered,
  })

  const triggerIfNeeded = async (): Promise<void> => {
    if (!existingOutput?.ideaAnalysis && ideaRun.status === 'idle') {
      await ideaRun.trigger()
    }
    if (!existingOutput?.marketResearch && marketRun.status === 'idle' && ideaRun.status === 'complete') {
      await marketRun.trigger()
    }
    if (!existingOutput?.validation && validationRun.status === 'idle' && marketRun.status === 'complete') {
      await validationRun.trigger()
    }
  }

  void triggerIfNeeded()

  const visibleCard1 = Boolean(existingOutput?.ideaAnalysis || ideaRun.status !== 'idle')
  const visibleCard2 = Boolean(existingOutput?.marketResearch || ideaRun.status === 'complete' || marketRun.status !== 'idle')
  const visibleCard3 = Boolean(existingOutput?.validation || marketRun.status === 'complete' || validationRun.status !== 'idle')

  return (
    <section className="space-y-4">
      <DocModeIndicator docMode={activeDocMode} />

      <OutputCard title="Problem & Solution" agentType="idea_analyzer" isVisible={visibleCard1} isStreaming={ideaRun.status === 'running'}>
        {ideaRun.status === 'running' ? (
          <p className="text-sm text-slate-700">{ideaRun.streamedText}</p>
        ) : (
          <div className="space-y-2 text-sm">
            <p><span className="mr-2 text-xs font-semibold uppercase tracking-[0.08em] text-brand">PROBLEM</span>{ideaOutput?.problemStatement ?? ''}</p>
            <p><span className="mr-2 text-xs font-semibold uppercase tracking-[0.08em] text-brand">SOLUTION</span>{ideaOutput?.solution ?? ''}</p>
            <p><span className="mr-2 text-xs font-semibold uppercase tracking-[0.08em] text-brand">ICP</span>{ideaOutput?.icp ?? ''}</p>
          </div>
        )}
      </OutputCard>

      <OutputCard title="Market Research" agentType="market_research" isVisible={visibleCard2} isStreaming={marketRun.status === 'running'}>
        {marketRun.status === 'running' ? (
          <p className="text-sm text-slate-700">{marketRun.streamedText}</p>
        ) : (
          <div className="space-y-3">
            <CompetitorTable competitors={marketOutput?.competitors ?? []} />
            <p className="text-sm text-slate-700">{marketOutput?.marketGap ?? ''}</p>
          </div>
        )}
      </OutputCard>

      <OutputCard title="Validation Score" agentType="validation" isVisible={visibleCard3} isStreaming={validationRun.status === 'running'}>
        {validationRun.status === 'running' ? (
          <p className="text-sm text-slate-700">{validationRun.streamedText}</p>
        ) : (
          <div className="space-y-3">
            <ValidationScoreCircle score={validationOutput?.demandScore ?? 0} />
            <div className="text-sm text-slate-700">
              <p><span className="font-semibold text-heading">Verdict:</span> {validationOutput?.verdict ?? '—'}</p>
              <p><span className="font-semibold text-heading">Risk:</span> {validationOutput?.riskLevel ?? '—'}</p>
              <p>{validationOutput?.reasoning ?? ''}</p>
            </div>
          </div>
        )}
      </OutputCard>

      <CrossCheckBadge crossChecks={allCrossChecks} />

      {phaseAdvance.showCopilotCard ? (
        <CopilotQuestionCard projectId={projectId} phase={1} onSubmit={() => setCopilotAnswered(true)} />
      ) : null}

      <div className="pt-2">
        <button
          type="button"
          onClick={() => void phaseAdvance.advance()}
          disabled={!phaseAdvance.canAdvance || phaseAdvance.isAdvancing}
          className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next Phase →
        </button>
      </div>
    </section>
  )
}
