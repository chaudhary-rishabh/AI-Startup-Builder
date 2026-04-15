import type { AgentType } from '@repo/types'

import { getAgent } from '../agents/registry.js'
import * as agentOutputsQueries from '../db/queries/agentOutputs.queries.js'
import * as agentRunsQueries from '../db/queries/agentRuns.queries.js'
import { publishAgentRunCompleted } from '../events/publisher.js'
import { getRAGEligibleAgents, selectModel } from './modelRouter.service.js'
import { resolveDocumentContext } from './documentIntelligence.service.js'
import {
  appendFrameToCanvas,
  fetchConversationHistory,
  fetchProjectContext,
  saveAgentOutputToProject,
  saveDesignTokensToCanvas,
} from './contextThread.service.js'
import { publishStreamChunk, publishStreamEvent } from './streamingService.js'
import { checkAndEmitBudgetWarnings, recordTokenUsage } from './tokenBudget.service.js'

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

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
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

  const agent = getAgent(agentType)

  await agentRunsQueries.updateAgentRunStatus(runId, {
    status: 'running',
    startedAt: new Date(),
  })
  await publishStreamEvent(runId, 'start', { agentType, phase })

  const context = await fetchProjectContext(projectId, userId, requestId)
  const history = await fetchConversationHistory(projectId, phase, authorization, requestId)

  let documentContent = ''
  let docMode: 'direct' | 'compressed' | 'contextual_rag' | 'none' = 'none'

  if (RAG_ELIGIBLE.has(agentType)) {
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

    await agentOutputsQueries.createAgentOutput({
      runId,
      outputData: runResult.outputData,
      rawText: runResult.rawText,
      parseSuccess: runResult.parseSuccess,
    })

    await saveAgentOutputToProject(projectId, phase, runResult.outputData, agentType, requestId)

    if (agentType === 'uiux' && runResult.parseSuccess) {
      const ds = runResult.outputData['designSystem']
      if (ds && typeof ds === 'object') {
        await saveDesignTokensToCanvas(projectId, ds as Record<string, unknown>, requestId)
      }
    }
    if (agentType === 'generate_frame' && runResult.parseSuccess) {
      const frame = runResult.outputData['frame']
      const screenName = runResult.outputData['screenName']
      if (frame && typeof frame === 'object' && typeof screenName === 'string') {
        await appendFrameToCanvas(
          projectId,
          frame as Record<string, unknown>,
          screenName,
          requestId,
        )
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
      runResult.outputData,
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
