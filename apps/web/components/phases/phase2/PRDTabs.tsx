'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { CrossCheckBadge } from '@/components/phases/CrossCheckBadge'
import { DocModeIndicator } from '@/components/phases/DocModeIndicator'
import { DesignTokensPreview } from '@/components/phases/phase2/DesignTokensPreview'
import { FeatureList } from '@/components/phases/phase2/FeatureList'
import { FlowDiagram } from '@/components/phases/phase2/FlowDiagram'
import { SystemDesignCards } from '@/components/phases/phase2/SystemDesignCards'
import { UserStoryList } from '@/components/phases/phase2/UserStoryList'
import { WireframeGrid } from '@/components/phases/phase2/WireframeGrid'
import { useAgentRun } from '@/hooks/useAgentRun'
import { useProjectStore } from '@/store/projectStore'
import type {
  BuildMode,
  FlowStep,
  MoSCoWFeature,
  Phase2Output,
  SSECrossCheckEvent,
  SSEDocModeEvent,
  TechStackCard,
  UserStory,
  WireframeScreen,
} from '@/types'

type TabKey = 'prd' | 'flow' | 'system' | 'uiux'

interface PRDTabsProps {
  projectId: string
  buildMode: BuildMode
  existingOutput?: Phase2Output
  onAllAgentsComplete: () => void
  onStatusChange?: (
    agentType: 'prd' | 'user_flow' | 'system_design' | 'uiux',
    status: 'idle' | 'running' | 'complete' | 'error',
    tokenCount?: number,
  ) => void
  onActiveTabChange?: (tab: TabKey) => void
  registerTabTrigger?: (trigger: (tab: TabKey) => Promise<void>) => void
  pendingMessage?: { tab: TabKey; message: string; nonce: number } | null
}

const tabMeta: Array<{ key: TabKey; label: string; query: string }> = [
  { key: 'prd', label: 'PRD', query: 'prd' },
  { key: 'flow', label: 'User Flow', query: 'flow' },
  { key: 'system', label: 'System Design', query: 'system' },
  { key: 'uiux', label: 'UI/UX', query: 'uiux' },
]

function parseTabFromUrl(): TabKey | null {
  if (typeof window === 'undefined') return null
  const query = new URLSearchParams(window.location.search).get('tab')
  const hash = window.location.hash.replace('#', '')
  const candidate = (query || hash) as TabKey
  return tabMeta.some((tab) => tab.key === candidate) ? candidate : null
}

function mapRunStatus(status: string): 'idle' | 'running' | 'complete' | 'error' {
  if (status === 'running' || status === 'starting' || status === 'connected') return 'running'
  if (status === 'complete') return 'complete'
  if (status === 'error') return 'error'
  return 'idle'
}

export function PRDTabs({
  projectId,
  buildMode,
  existingOutput,
  onAllAgentsComplete,
  onStatusChange,
  onActiveTabChange,
  registerTabTrigger,
  pendingMessage,
}: PRDTabsProps): JSX.Element {
  const setDesignTokens = useProjectStore((state) => state.setDesignTokens)
  const [activeTab, setActiveTab] = useState<TabKey>(parseTabFromUrl() ?? 'prd')
  const [prdFeatures, setPrdFeatures] = useState<MoSCoWFeature[]>(existingOutput?.prd?.features ?? [])
  const [prdStories, setPrdStories] = useState<UserStory[]>(existingOutput?.prd?.userStories ?? [])
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>(existingOutput?.userFlow?.flowSteps ?? [])
  const [techStack, setTechStack] = useState<TechStackCard[]>(existingOutput?.systemDesign?.techStack ?? [])
  const [apiEndpoints, setApiEndpoints] = useState(existingOutput?.systemDesign?.apiEndpoints ?? [])
  const [wireframes, setWireframes] = useState<WireframeScreen[]>(existingOutput?.uiux?.wireframes ?? [])
  const [designSystem, setDesignSystem] = useState(existingOutput?.uiux?.designSystem ?? null)

  const prdRun = useAgentRun({
    projectId,
    phase: 2,
    agentType: 'prd',
    ...(pendingMessage?.tab === 'prd' ? { userMessage: pendingMessage.message } : {}),
    onComplete: (output) => {
      setPrdFeatures((output.features as MoSCoWFeature[]) ?? [])
      setPrdStories((output.userStories as UserStory[]) ?? [])
    },
  })
  const flowRun = useAgentRun({
    projectId,
    phase: 2,
    agentType: 'user_flow',
    ...(pendingMessage?.tab === 'flow' ? { userMessage: pendingMessage.message } : {}),
    onComplete: (output) => {
      setFlowSteps((output.flowSteps as FlowStep[]) ?? [])
    },
  })
  const systemRun = useAgentRun({
    projectId,
    phase: 2,
    agentType: 'system_design',
    ...(pendingMessage?.tab === 'system' ? { userMessage: pendingMessage.message } : {}),
    onComplete: (output) => {
      setTechStack((output.techStack as TechStackCard[]) ?? [])
      setApiEndpoints((output.apiEndpoints as Array<{ method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; route: string; description: string }>) ?? [])
    },
  })
  const uiuxRun = useAgentRun({
    projectId,
    phase: 2,
    agentType: 'uiux',
    ...(pendingMessage?.tab === 'uiux' ? { userMessage: pendingMessage.message } : {}),
    onComplete: (output) => {
      const nextWireframes = (output.wireframes as WireframeScreen[]) ?? []
      const nextDesignSystem = (output.designSystem as typeof designSystem) ?? null
      setWireframes(nextWireframes)
      setDesignSystem(nextDesignSystem)
      if (nextDesignSystem) setDesignTokens(nextDesignSystem)
    },
  })

  const tabStatuses = useMemo(
    () => ({
      prd: mapRunStatus(prdRun.status),
      flow: mapRunStatus(flowRun.status),
      system: mapRunStatus(systemRun.status),
      uiux: mapRunStatus(uiuxRun.status),
    }),
    [flowRun.status, prdRun.status, systemRun.status, uiuxRun.status],
  )

  useEffect(() => {
    const apply = (tab: TabKey): void => {
      setActiveTab(tab)
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.set('tab', tab)
        url.hash = tab
        window.history.pushState({}, '', url.toString())
      }
      onActiveTabChange?.(tab)
    }
    const initialTab = parseTabFromUrl()
    if (initialTab) apply(initialTab)

    const handleHashChange = (): void => {
      const nextTab = parseTabFromUrl()
      if (nextTab) {
        setActiveTab(nextTab)
        onActiveTabChange?.(nextTab)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [onActiveTabChange])

  useEffect(() => {
    if (tabStatuses.prd === 'running') setActiveTab('prd')
    if (tabStatuses.flow === 'running') setActiveTab('flow')
    if (tabStatuses.system === 'running') setActiveTab('system')
    if (tabStatuses.uiux === 'running') setActiveTab('uiux')
  }, [tabStatuses])

  useEffect(() => {
    onStatusChange?.('prd', tabStatuses.prd, prdRun.tokensUsed)
    onStatusChange?.('user_flow', tabStatuses.flow, flowRun.tokensUsed)
    onStatusChange?.('system_design', tabStatuses.system, systemRun.tokensUsed)
    onStatusChange?.('uiux', tabStatuses.uiux, uiuxRun.tokensUsed)
  }, [
    flowRun.tokensUsed,
    onStatusChange,
    prdRun.tokensUsed,
    systemRun.tokensUsed,
    tabStatuses.flow,
    tabStatuses.prd,
    tabStatuses.system,
    tabStatuses.uiux,
    uiuxRun.tokensUsed,
  ])

  const completion = {
    prd: prdFeatures.length > 0 || tabStatuses.prd === 'complete',
    flow: flowSteps.length > 0 || tabStatuses.flow === 'complete',
    system: techStack.length > 0 || tabStatuses.system === 'complete',
    uiux: wireframes.length > 0 || tabStatuses.uiux === 'complete',
  }

  const allComplete = completion.prd && completion.flow && completion.system && completion.uiux

  useEffect(() => {
    if (allComplete) onAllAgentsComplete()
  }, [allComplete, onAllAgentsComplete])

  useEffect(() => {
    if (buildMode !== 'autopilot') return
    if (!completion.prd && tabStatuses.prd === 'idle') {
      void prdRun.trigger()
      return
    }
    if (completion.prd && !completion.flow && tabStatuses.flow === 'idle') {
      void flowRun.trigger()
      return
    }
    if (completion.prd && completion.flow && !completion.system && tabStatuses.system === 'idle') {
      void systemRun.trigger()
      return
    }
    if (completion.prd && completion.flow && completion.system && !completion.uiux && tabStatuses.uiux === 'idle') {
      void uiuxRun.trigger()
    }
  }, [buildMode, completion.flow, completion.prd, completion.system, completion.uiux, flowRun, prdRun, systemRun, tabStatuses.flow, tabStatuses.prd, tabStatuses.system, tabStatuses.uiux, uiuxRun])

  const triggerForTab = async (tab: TabKey): Promise<void> => {
    if (tab === 'prd') {
      prdRun.reset()
      await prdRun.trigger()
      return
    }
    if (tab === 'flow') {
      flowRun.reset()
      await flowRun.trigger()
      return
    }
    if (tab === 'system') {
      systemRun.reset()
      await systemRun.trigger()
      return
    }
    uiuxRun.reset()
    await uiuxRun.trigger()
  }

  useEffect(() => {
    registerTabTrigger?.(triggerForTab)
  }, [registerTabTrigger])

  useEffect(() => {
    if (!pendingMessage) return
    if (pendingMessage.tab === 'prd' && !completion.prd) void prdRun.trigger()
    if (pendingMessage.tab === 'flow' && !completion.flow) void flowRun.trigger()
    if (pendingMessage.tab === 'system' && !completion.system) void systemRun.trigger()
    if (pendingMessage.tab === 'uiux' && !completion.uiux) void uiuxRun.trigger()
  }, [completion.flow, completion.prd, completion.system, completion.uiux, flowRun, pendingMessage, prdRun, systemRun, uiuxRun])

  const activeDocMode: SSEDocModeEvent | null =
    uiuxRun.docMode ?? systemRun.docMode ?? flowRun.docMode ?? prdRun.docMode
  const allCrossChecks: SSECrossCheckEvent[] = [
    ...prdRun.crossChecks,
    ...flowRun.crossChecks,
    ...systemRun.crossChecks,
    ...uiuxRun.crossChecks,
  ]

  const isActiveRunning =
    (activeTab === 'prd' && tabStatuses.prd === 'running') ||
    (activeTab === 'flow' && tabStatuses.flow === 'running') ||
    (activeTab === 'system' && tabStatuses.system === 'running') ||
    (activeTab === 'uiux' && tabStatuses.uiux === 'running')

  return (
    <section className="space-y-3">
      <DocModeIndicator docMode={activeDocMode} />

      <div className="border-b border-divider">
        <div className="flex items-center gap-5">
          {tabMeta.map((tab) => {
            const status = tabStatuses[tab.key]
            return (
              <button
                key={tab.key}
                type="button"
                className={`inline-flex h-10 items-center gap-2 border-b-2 text-sm transition ${
                  activeTab === tab.key
                    ? 'border-brand font-semibold text-heading'
                    : 'border-transparent text-muted hover:text-heading'
                }`}
                onClick={() => {
                  setActiveTab(tab.key)
                  const url = new URL(window.location.href)
                  url.searchParams.set('tab', tab.key)
                  url.hash = tab.key
                  window.history.pushState({}, '', url.toString())
                  onActiveTabChange?.(tab.key)
                }}
              >
                {tab.label}
                {status === 'running' ? <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" /> : null}
                {status === 'complete' ? <span className="h-2 w-2 rounded-full bg-success" /> : null}
                {status === 'error' ? <span className="h-2 w-2 rounded-full bg-error" /> : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className="group relative rounded-card border border-divider bg-card p-4">
        <button
          type="button"
          onClick={() => void triggerForTab(activeTab)}
          className="absolute right-3 top-3 hidden items-center gap-1 text-xs text-muted group-hover:inline-flex"
        >
          <RotateCcw size={14} /> Regenerate section
        </button>

        {isActiveRunning ? <div className="absolute inset-0 shimmer rounded-card opacity-40" /> : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {activeTab === 'prd' ? (
              <div className="space-y-4">
                <FeatureList
                  projectId={projectId}
                  features={prdFeatures}
                  isStreaming={tabStatuses.prd === 'running'}
                  streamedText={prdRun.streamedText}
                  onFeatureAdd={(feature) => {
                    setPrdFeatures((prev) => [...prev, { ...feature, id: crypto.randomUUID() }])
                  }}
                />
                <UserStoryList
                  projectId={projectId}
                  stories={prdStories}
                  isStreaming={tabStatuses.prd === 'running'}
                  streamedText={prdRun.streamedText}
                />
              </div>
            ) : null}

            {activeTab === 'flow' ? (
              <FlowDiagram
                flowSteps={flowSteps}
                isStreaming={tabStatuses.flow === 'running'}
                streamedText={flowRun.streamedText}
              />
            ) : null}

            {activeTab === 'system' ? (
              <SystemDesignCards
                techStack={techStack}
                apiEndpoints={apiEndpoints}
                isStreaming={tabStatuses.system === 'running'}
                streamedText={systemRun.streamedText}
              />
            ) : null}

            {activeTab === 'uiux' ? (
              <div className="space-y-4">
                <WireframeGrid
                  screens={wireframes}
                  designTokens={designSystem}
                  isStreaming={tabStatuses.uiux === 'running'}
                  streamedText={uiuxRun.streamedText}
                />
                <DesignTokensPreview designTokens={designSystem} isStreaming={tabStatuses.uiux === 'running'} />
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <CrossCheckBadge crossChecks={allCrossChecks} />
    </section>
  )
}
