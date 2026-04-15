import type { AgentType } from '@repo/types'

import { SkeletonAgent } from '../agents/phase4/skeletonAgent.agent.js'
import { getAgent } from '../agents/registry.js'
import type { BaseAgent } from '../agents/base.agent.js'
import {
  phase1AsRecord,
  phase2AsRecord,
  phase3AsRecord,
  phase4AsRecord,
  phase5AsRecord,
  phase6AsRecord,
} from '../agents/prompt.helpers.js'
import * as agentOutputsQueries from '../db/queries/agentOutputs.queries.js'
import * as agentRunsQueries from '../db/queries/agentRuns.queries.js'
import { getRedis } from '../lib/redis.js'
import { publishAgentRunCompleted } from '../events/publisher.js'
import { getRAGEligibleAgents, selectModel } from './modelRouter.service.js'
import { resolveDocumentContext } from './documentIntelligence.service.js'
import {
  appendFrameToCanvas,
  fetchConversationHistory,
  fetchProjectContext,
  saveAgentOutputToProject,
  saveDesignTokensToCanvas,
  saveProjectPrototypeFile,
} from './contextThread.service.js'
import { orchestratePhase4 } from './batchOrchestrator.service.js'
import {
  crossCheck0,
  crossCheck1A,
  crossCheck1B,
  crossCheck2,
  crossCheck3A,
} from './crossCheck.service.js'
import type { CrossCheckResult } from './crossCheck.service.js'
import { estimateProjectSize } from './estimateProjectSize.service.js'
import { generatePhaseDoc } from './docGenerator.service.js'
import { publishStreamChunk, publishStreamEvent } from './streamingService.js'
import { checkAndEmitBudgetWarnings, recordTokenUsage } from './tokenBudget.service.js'

import type { FileSpec } from '../types/phase4.types.js'

export interface OrchestratorInput {
  runId: string
  projectId: string
  userId: string
  phase: number
  agentType: AgentType
  userMessage?: string
  requestId?: string
  authorization?: string
}

const RAG_ELIGIBLE = new Set<string>(getRAGEligibleAgents())

const PHASE4_ORCHESTRATED = new Set<AgentType>([
  'schema_generator',
  'api_generator',
  'backend',
  'frontend',
  'integration',
])

const PHASE_COMPLETING_AGENTS: Partial<Record<AgentType, number>> = {
  market_research: 1,
  uiux: 2,
  generate_frame: 3,
  integration: 4,
  cicd: 5,
  growth_strategy: 6,
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

function isPhase4Orchestrated(agentType: AgentType): boolean {
  return PHASE4_ORCHESTRATED.has(agentType)
}

export function classifyError(error: unknown): string {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  if (msg.includes('rate_limit')) return 'PROVIDER_RATE_LIMIT'
  if (msg.includes('overloaded')) return 'PROVIDER_OVERLOADED'
  if (msg.includes('context_length')) return 'CONTEXT_TOO_LARGE'
  if (msg.includes('budget')) return 'BUDGET_EXCEEDED'
  if (msg.includes('not found')) return 'PROJECT_NOT_FOUND'
  if (msg.includes('timeout')) return 'TIMEOUT'
  return 'INTERNAL_ERROR'
}

export async function executeAgentRun(input: OrchestratorInput): Promise<void> {
  const start = Date.now()
  const { runId, projectId, userId, phase, agentType, userMessage, requestId, authorization } =
    input

  const agent: BaseAgent | null = isPhase4Orchestrated(agentType) ? null : getAgent(agentType)

  await agentRunsQueries.updateAgentRunStatus(runId, {
    status: 'running',
    startedAt: new Date(),
  })
  await publishStreamEvent(runId, 'start', { agentType, phase })

  const context = await fetchProjectContext(projectId, userId, requestId)
  const history = await fetchConversationHistory(projectId, phase, authorization, requestId)

  let documentContent = ''
  let docMode: 'direct' | 'compressed' | 'contextual_rag' | 'none' = 'none'

  if (agent && RAG_ELIGIBLE.has(agentType)) {
    const docResult = await resolveDocumentContext(
      userId,
      projectId,
      agent.getAgentTask(),
      agentType,
    )
    documentContent = docResult.content
    docMode = docResult.mode
    await publishStreamEvent(runId, 'doc_mode', {
      mode: docResult.mode,
      docCount: docResult.docCount,
      tokenCount: docResult.tokenCount,
    })
  }

  await agentRunsQueries.updateAgentRunStatus(runId, {
    ragContextUsed: docMode !== 'none',
    docInjectionMode: docMode,
    contextTokensEstimate: estimateTokenCount(documentContent),
  })

  try {
    if (phase === 4 && isPhase4Orchestrated(agentType)) {
      await orchestratePhase4(runId, projectId, userId, agentType, context)
      const mergedOutput: Record<string, unknown> = {
        ...phase4AsRecord(context),
        orchestrated: true,
        agentType,
      }
      await agentOutputsQueries.createAgentOutput({
        runId,
        outputData: mergedOutput,
        rawText: '',
        parseSuccess: true,
      })
      await saveAgentOutputToProject(projectId, phase, mergedOutput, agentType, requestId)

      const phaseForDoc = PHASE_COMPLETING_AGENTS[agentType]
      if (phaseForDoc !== undefined) {
        const freshContext = await fetchProjectContext(projectId, userId, requestId)
        await generatePhaseDoc(phaseForDoc, projectId, freshContext).catch((err) =>
          console.error('[ai-service] Doc generation failed (non-fatal)', { err, agentType, projectId }),
        )
      }

      await recordTokenUsage(userId, 0, '0')
      const durationMs = Date.now() - start
      await agentRunsQueries.updateAgentRunStatus(runId, {
        status: 'completed',
        completedAt: new Date(),
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: '0',
        durationMs,
        ragContextUsed: docMode !== 'none',
        docInjectionMode: docMode,
        wasContextCompressed: docMode === 'compressed',
      })
      await publishStreamEvent(runId, 'complete', {
        tokensUsed: 0,
        durationMs,
        docMode,
      })
      await publishAgentRunCompleted(
        runId,
        projectId,
        userId,
        phase,
        agentType,
        mergedOutput,
        0,
        durationMs,
        selectModel(agentType),
      )
      await checkAndEmitBudgetWarnings(userId)
      return
    }

    if (!agent) {
      throw new Error(`No agent instance for ${agentType}`)
    }

    const runInput = {
      projectId,
      userId,
      phase,
      context,
      documentContent,
      docInjectionMode: docMode,
      conversationHistory: history,
      runId,
      ...(userMessage !== undefined ? { userMessage } : {}),
      ...(requestId !== undefined ? { requestId } : {}),
    }
    const runResult = await agent.run(
      runInput,
      async (chunk: string) => {
        await publishStreamChunk(runId, chunk)
      },
      (event: string) => {
        console.debug('[ai-service] agent progress', { runId, event })
      },
    )

    let mergedOutput: Record<string, unknown> = runResult.outputData
    if (phase === 1) {
      mergedOutput = { ...phase1AsRecord(context), ...runResult.outputData }
    } else if (phase === 2) {
      mergedOutput = { ...phase2AsRecord(context), ...runResult.outputData }
    } else if (phase === 3) {
      const prior = phase3AsRecord(context)
      mergedOutput = { ...prior, ...runResult.outputData }
      if (agentType === 'generate_frame' && runResult.parseSuccess && mergedOutput['frame']) {
        const frame = mergedOutput['frame'] as Record<string, unknown>
        const prevScreens = Array.isArray(prior['screens']) ? [...(prior['screens'] as unknown[])] : []
        prevScreens.push({
          screenName: frame['screenName'] ?? mergedOutput['screenName'],
          html: frame['html'],
          route: frame['route'],
          generatedAt: frame['generatedAt'],
        })
        mergedOutput['screens'] = prevScreens
      }
    } else if (phase === 4) {
      mergedOutput = { ...phase4AsRecord(context), ...runResult.outputData }
    } else if (phase === 5) {
      mergedOutput = { ...phase5AsRecord(context), ...runResult.outputData }
    } else if (phase === 6) {
      mergedOutput = { ...phase6AsRecord(context), ...runResult.outputData }
    }

    let ideaCross: CrossCheckResult | undefined
    let marketCross: CrossCheckResult | undefined
    if (agentType === 'idea_analyzer') {
      ideaCross = crossCheck1A(mergedOutput)
    }
    if (agentType === 'market_research') {
      marketCross = crossCheck1B(mergedOutput)
    }

    if (agentType === 'skeleton' && runResult.parseSuccess) {
      const rawFiles = mergedOutput['files']
      const files: FileSpec[] = Array.isArray(rawFiles) ? (rawFiles as FileSpec[]) : []
      const check3a = crossCheck3A(files, context)
      mergedOutput['files'] = check3a.fixedPlan
      if (agent instanceof SkeletonAgent) {
        await agent.savePlan(projectId, check3a.fixedPlan, context)
      }
    }

    await agentOutputsQueries.createAgentOutput({
      runId,
      outputData: mergedOutput,
      rawText: runResult.rawText,
      parseSuccess: runResult.parseSuccess,
    })

    await saveAgentOutputToProject(projectId, phase, mergedOutput, agentType, requestId)

    if (ideaCross) {
      await publishStreamEvent(runId, 'cross_check', {
        check: 'check_1a_idea',
        passed: ideaCross.passed,
        issues: ideaCross.issues,
        autoFixed: ideaCross.autoFixed,
      })
    }
    if (marketCross) {
      await publishStreamEvent(runId, 'cross_check', {
        check: 'check_1b_market',
        passed: marketCross.passed,
        issues: marketCross.issues,
        autoFixed: marketCross.autoFixed,
      })
    }

    if (agentType === 'uiux') {
      const freshContext = await fetchProjectContext(projectId, userId, requestId)
      const estimate = estimateProjectSize(freshContext)
      const check0 = crossCheck0(freshContext, estimate)
      const check2 = crossCheck2(freshContext)
      await publishStreamEvent(runId, 'cross_check', {
        check: 'check_0_estimate',
        passed: check0.passed,
        issues: check0.issues,
      })
      await publishStreamEvent(runId, 'cross_check', {
        check: 'check_2_phase2',
        passed: check2.passed,
        issues: check2.issues,
      })
      const redis = getRedis()
      await redis.setex(`ai:estimate:${projectId}`, 3600, JSON.stringify(estimate))
    }

    const phaseForDoc = PHASE_COMPLETING_AGENTS[agentType]
    if (phaseForDoc !== undefined) {
      const freshContext = await fetchProjectContext(projectId, userId, requestId)
      await generatePhaseDoc(phaseForDoc, projectId, freshContext).catch((err) =>
        console.error('[ai-service] Doc generation failed (non-fatal)', { err, agentType, projectId }),
      )
    }

    if (agentType === 'skeleton' && runResult.parseSuccess) {
      const files = mergedOutput['files'] as FileSpec[]
      const totalFiles = Array.isArray(files) ? files.length : 0
      const tier =
        totalFiles <= 25
          ? 'small'
          : totalFiles <= 75
            ? 'standard'
            : totalFiles <= 150
              ? 'large'
              : 'enterprise'
      const batchNums = Array.isArray(files) ? files.map((f) => f.batchNumber) : [1]
      const totalBatches = batchNums.length > 0 ? Math.max(...batchNums) : 1
      await publishStreamEvent(runId, 'batch_complete', {
        summary: `Skeleton plan saved (${totalFiles} files)`,
        totalFiles,
        totalBatches,
        tier,
      })
      await publishStreamEvent(runId, 'skeleton_complete', {
        totalFiles,
        totalBatches,
        tier,
      })
    }

    if (agentType === 'uiux' && runResult.parseSuccess) {
      const ds = mergedOutput['designSystem']
      if (ds && typeof ds === 'object') {
        await saveDesignTokensToCanvas(projectId, ds as Record<string, unknown>, requestId)
      }
    }
    if (agentType === 'generate_frame' && runResult.parseSuccess) {
      const frame = mergedOutput['frame']
      const screenName = mergedOutput['screenName']
      if (frame && typeof frame === 'object' && typeof screenName === 'string') {
        await appendFrameToCanvas(
          projectId,
          frame as Record<string, unknown>,
          screenName,
          requestId,
        )
        const html = (frame as Record<string, unknown>)['html']
        if (typeof html === 'string' && html.length > 0) {
          await saveProjectPrototypeFile(
            projectId,
            `/prototypes/${screenName}.html`,
            html,
            'html',
            'generate_frame',
            requestId,
          )
        }
      }
    }

    await recordTokenUsage(userId, runResult.totalTokens, runResult.costUsd)

    const durationMs = Date.now() - start
    await agentRunsQueries.updateAgentRunStatus(runId, {
      status: 'completed',
      completedAt: new Date(),
      promptTokens: runResult.promptTokens,
      completionTokens: runResult.completionTokens,
      totalTokens: runResult.totalTokens,
      costUsd: runResult.costUsd,
      durationMs,
      ragContextUsed: docMode !== 'none',
      docInjectionMode: docMode,
      wasContextCompressed: docMode === 'compressed',
    })

    await publishStreamEvent(runId, 'complete', {
      tokensUsed: runResult.totalTokens,
      durationMs,
      docMode,
    })

    await publishAgentRunCompleted(
      runId,
      projectId,
      userId,
      phase,
      agentType,
      mergedOutput,
      runResult.totalTokens,
      durationMs,
      selectModel(agentType),
    )

    await checkAndEmitBudgetWarnings(userId)
  } catch (error) {
    const code = classifyError(error)
    const message = error instanceof Error ? error.message : 'Export failed'
    await agentRunsQueries.updateAgentRunStatus(runId, {
      status: 'failed',
      errorMessage: message,
      errorCode: code,
      completedAt: new Date(),
    })
    await publishStreamEvent(runId, 'error', { code, message })
    console.error('[ai-service] executeAgentRun failed', { runId, error })
    throw error
  }
}
