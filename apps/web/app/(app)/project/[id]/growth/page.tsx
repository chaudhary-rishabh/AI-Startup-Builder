'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'

import api from '@/lib/axios'
import { ChatPanel, type ChatMessage } from '@/components/phases/ChatPanel'
import { FeedbackTable, type FeedbackEntry } from '@/components/phases/phase6/FeedbackTable'
import { FunnelDiagram, type FunnelStep } from '@/components/phases/phase6/FunnelDiagram'
import { GrowthActions, type GrowthActionItem } from '@/components/phases/phase6/GrowthActions'
import { KPICards, type KpiValues } from '@/components/phases/phase6/KPICards'
import { useAgentRun } from '@/hooks/useAgentRun'
import { useDesignMode } from '@/hooks/useDesignMode'
import { useProject } from '@/hooks/useProject'

const defaultKpis: KpiValues = {
  activeUsers: 0,
  retentionRate: 0,
  churnPercent: 0,
  mrr: 0,
}

const defaultFunnel: FunnelStep[] = [
  { name: 'Acquisition', users: 0, conversionRate: 100, dropOffRate: 0 },
  { name: 'Activation', users: 0, conversionRate: 0, dropOffRate: 0 },
  { name: 'Retention', users: 0, conversionRate: 0, dropOffRate: 0 },
  { name: 'Revenue', users: 0, conversionRate: 0, dropOffRate: 0 },
]

export default function GrowthPage({ params }: { params: Promise<{ id: string }> }): JSX.Element {
  const { id: projectId } = use(params)
  const { data: project } = useProject(projectId)
  const { switchToDesign } = useDesignMode()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [kpis, setKpis] = useState<KpiValues>(defaultKpis)
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>(defaultFunnel)
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([])
  const [growthActions, setGrowthActions] = useState<GrowthActionItem[]>([])
  const [playbookSteps, setPlaybookSteps] = useState<string[]>([
    'Ship a narrow MVP to 10 design partners',
    'Post weekly build logs on LinkedIn',
    'Collect 20 structured interviews',
  ])

  const feedbackAfterAnalytics = useRef(false)
  const growthAfterFeedback = useRef(false)
  const autoAnalyticsScheduled = useRef(false)

  useEffect(() => {
    feedbackAfterAnalytics.current = false
    growthAfterFeedback.current = false
    autoAnalyticsScheduled.current = false
  }, [projectId])

  useEffect(() => {
    switchToDesign()
  }, [switchToDesign])

  const analyticsRun = useAgentRun({
    projectId,
    agentType: 'analytics_agent',
    phase: 6,
    onComplete: (output) => {
      const k = output.kpis as KpiValues | undefined
      if (k) setKpis(k)
      const fd = output.funnelDef as { steps?: FunnelStep[] } | FunnelStep[] | undefined
      const steps = Array.isArray(fd) ? fd : fd?.steps
      if (steps?.length) setFunnelSteps(steps)
    },
  })

  const feedbackRun = useAgentRun({
    projectId,
    agentType: 'feedback',
    phase: 6,
    onComplete: (output) => {
      const list = output.sentimentByEntry as FeedbackEntry[] | undefined
      if (list?.length) setFeedbackEntries(list)
    },
  })

  const growthRun = useAgentRun({
    projectId,
    agentType: 'growth',
    phase: 6,
    onComplete: (output) => {
      const ch = output.marketingChannels as GrowthActionItem[] | undefined
      if (ch?.length) setGrowthActions(ch)
      const stepsOut = output.firstHundredSteps as string[] | undefined
      if (stepsOut?.length) setPlaybookSteps(stepsOut)
    },
  })

  useEffect(() => {
    if (!project || project.buildMode !== 'autopilot') return
    if (autoAnalyticsScheduled.current) return
    autoAnalyticsScheduled.current = true
    const id = window.setTimeout(() => {
      void analyticsRun.trigger()
    }, 400)
    return () => window.clearTimeout(id)
  }, [project?.id, project?.buildMode, analyticsRun])

  useEffect(() => {
    if (!project || project.buildMode !== 'autopilot') return
    if (analyticsRun.status !== 'complete' || feedbackAfterAnalytics.current) return
    feedbackAfterAnalytics.current = true
    void feedbackRun.trigger()
  }, [project, analyticsRun.status, feedbackRun])

  useEffect(() => {
    if (!project || project.buildMode !== 'autopilot') return
    if (feedbackRun.status !== 'complete' || growthAfterFeedback.current) return
    growthAfterFeedback.current = true
    void growthRun.trigger()
  }, [project, feedbackRun.status, growthRun])

  const isAgentRunning =
    analyticsRun.status === 'running' ||
    analyticsRun.status === 'starting' ||
    feedbackRun.status === 'running' ||
    feedbackRun.status === 'starting' ||
    growthRun.status === 'running' ||
    growthRun.status === 'starting'

  const handleSend = useCallback(
    (message: string) => {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      }
      setMessages((prev) => {
        const next = [...prev, userMsg]
        queueMicrotask(async () => {
          try {
            const res = await api.post<{ data: { content: string } }>('/ai/chat', {
              messages: next.map((m) => ({ role: m.role, content: m.content })),
              context: { projectId, phase: 6 },
            })
            const text = res.data.data.content
            setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', content: text, timestamp: new Date() }])
          } catch {
            setMessages((m) => [
              ...m,
              { id: crypto.randomUUID(), role: 'assistant', content: 'Sorry, something went wrong.', timestamp: new Date() },
            ])
          }
        })
        return next
      })
    },
    [projectId],
  )

  if (!project) {
    return <div className="p-6">Loading…</div>
  }

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[520px] bg-bg">
      <ChatPanel
        projectId={projectId}
        phase={6}
        headerLabel="Growth copilot"
        placeholder="Ask about acquisition, retention, pricing..."
        chatContext="growth"
        messages={messages}
        isAgentRunning={isAgentRunning}
        onSend={handleSend}
        className="max-md:flex h-full max-h-none w-[320px] rounded-none border-r border-divider shadow-none"
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-output p-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void analyticsRun.trigger()}
              className="rounded-md border border-brand px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10"
            >
              Run analytics
            </button>
            <button
              type="button"
              onClick={() => void feedbackRun.trigger()}
              className="rounded-md border border-brand px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10"
            >
              Run feedback
            </button>
            <button
              type="button"
              onClick={() => void growthRun.trigger()}
              className="rounded-md border border-brand px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10"
            >
              Run growth
            </button>
          </div>
          <KPICards kpis={kpis} isStreaming={analyticsRun.status === 'running' || analyticsRun.status === 'starting'} />
          <FunnelDiagram steps={funnelSteps} />
          <FeedbackTable
            entries={feedbackEntries}
            isStreaming={feedbackRun.status === 'running' || feedbackRun.status === 'starting'}
            onAnalyzeFeedback={() => void feedbackRun.trigger()}
          />
        </div>
      </div>
      <GrowthActions projectId={projectId} actions={growthActions} playbookSteps={playbookSteps} />
    </div>
  )
}
