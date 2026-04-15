import { beforeEach, describe, expect, it, vi } from 'vitest'

const updateAgentRunStatus = vi.hoisted(() => vi.fn())
const createAgentOutput = vi.hoisted(() => vi.fn())
const publishStreamEvent = vi.hoisted(() => vi.fn())
const publishStreamChunk = vi.hoisted(() => vi.fn())
const resolveDocumentContext = vi.hoisted(() => vi.fn())
const fetchProjectContext = vi.hoisted(() => vi.fn())
const fetchConversationHistory = vi.hoisted(() => vi.fn())
const saveAgentOutputToProject = vi.hoisted(() => vi.fn())
const saveDesignTokensToCanvas = vi.hoisted(() => vi.fn())
const appendFrameToCanvas = vi.hoisted(() => vi.fn())
const saveProjectPrototypeFile = vi.hoisted(() => vi.fn())
const recordTokenUsage = vi.hoisted(() => vi.fn())
const publishAgentRunCompleted = vi.hoisted(() => vi.fn())
const checkAndEmitBudgetWarnings = vi.hoisted(() => vi.fn())
const getAgent = vi.hoisted(() => vi.fn())

vi.mock('../../src/db/queries/agentRuns.queries.js', () => ({
  updateAgentRunStatus,
}))

vi.mock('../../src/db/queries/agentOutputs.queries.js', () => ({
  createAgentOutput,
}))

vi.mock('../../src/events/publisher.js', () => ({
  publishAgentRunCompleted,
}))

vi.mock('../../src/services/streamingService.js', () => ({
  publishStreamEvent,
  publishStreamChunk,
}))

vi.mock('../../src/services/documentIntelligence.service.js', () => ({
  resolveDocumentContext,
}))

vi.mock('../../src/services/contextThread.service.js', () => ({
  fetchProjectContext,
  fetchConversationHistory,
  saveAgentOutputToProject,
  saveDesignTokensToCanvas,
  appendFrameToCanvas,
  saveProjectPrototypeFile,
}))

vi.mock('../../src/services/tokenBudget.service.js', () => ({
  recordTokenUsage,
  checkAndEmitBudgetWarnings,
}))

vi.mock('../../src/agents/registry.js', () => ({
  getAgent,
}))

import { executeAgentRun } from '../../src/services/agentOrchestrator.service.js'

describe('agentOrchestrator.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateAgentRunStatus.mockResolvedValue(undefined)
    createAgentOutput.mockResolvedValue(undefined)
    publishStreamEvent.mockResolvedValue(undefined)
    publishStreamChunk.mockResolvedValue(undefined)
    resolveDocumentContext.mockResolvedValue({
      mode: 'none',
      content: '',
      tokenCount: 0,
      docCount: 0,
      wasCompressed: false,
      ragUsed: false,
    })
    fetchProjectContext.mockResolvedValue({
      projectId: 'p',
      projectName: 'P',
      currentPhase: 1,
    })
    fetchConversationHistory.mockResolvedValue([])
    saveAgentOutputToProject.mockResolvedValue(undefined)
    saveDesignTokensToCanvas.mockResolvedValue(undefined)
    appendFrameToCanvas.mockResolvedValue(undefined)
    saveProjectPrototypeFile.mockResolvedValue(undefined)
    recordTokenUsage.mockResolvedValue(undefined)
    publishAgentRunCompleted.mockResolvedValue(undefined)
    checkAndEmitBudgetWarnings.mockResolvedValue(undefined)
  })

  function mockAgent(agentType: string, runResult: Record<string, unknown>) {
    getAgent.mockReturnValue({
      agentType,
      phase: 1,
      getAgentTask: () => 'do work',
      run: vi.fn().mockResolvedValue(runResult),
    } as never)
  }

  it('executeAgentRun: status pending→running→completed', async () => {
    mockAgent('idea_analyzer', {
      outputData: { x: 1 },
      rawText: '{}',
      parseSuccess: true,
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      costUsd: '0',
    })
    await executeAgentRun({
      runId: '550e8400-e29b-41d4-a716-446655440099',
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      phase: 1,
      agentType: 'idea_analyzer',
    })
    expect(updateAgentRunStatus).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440099',
      expect.objectContaining({ status: 'running' }),
    )
    expect(updateAgentRunStatus).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440099',
      expect.objectContaining({ status: 'completed' }),
    )
  })

  it('executeAgentRun calls resolveDocumentContext for RAG-eligible agents', async () => {
    mockAgent('prd_generator', {
      outputData: {},
      rawText: '{}',
      parseSuccess: true,
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      costUsd: '0',
    })
    await executeAgentRun({
      runId: '550e8400-e29b-41d4-a716-446655440099',
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      phase: 2,
      agentType: 'prd_generator',
    })
    expect(resolveDocumentContext).toHaveBeenCalled()
  })

  it('executeAgentRun does NOT call resolveDocumentContext for Phase 4 agents', async () => {
    mockAgent('backend', {
      outputData: {},
      rawText: '{}',
      parseSuccess: true,
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      costUsd: '0',
    })
    await executeAgentRun({
      runId: '550e8400-e29b-41d4-a716-446655440099',
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      phase: 4,
      agentType: 'backend',
    })
    expect(resolveDocumentContext).not.toHaveBeenCalled()
  })

  it('executeAgentRun calls saveDesignTokensToCanvas for uiux agent', async () => {
    mockAgent('uiux', {
      outputData: { designSystem: { token: 'v' } },
      rawText: '{}',
      parseSuccess: true,
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      costUsd: '0',
    })
    await executeAgentRun({
      runId: '550e8400-e29b-41d4-a716-446655440099',
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      phase: 2,
      agentType: 'uiux',
    })
    expect(saveDesignTokensToCanvas).toHaveBeenCalledWith(
      '660e8400-e29b-41d4-a716-446655440001',
      { token: 'v' },
      undefined,
    )
  })

  it('executeAgentRun calls appendFrameToCanvas and saves prototype HTML for generate_frame', async () => {
    mockAgent('generate_frame', {
      outputData: {
        frame: { screenName: 'Home', html: '<div class="min-h-screen p-2">x</div>' },
        screenName: 'Home',
      },
      rawText: '<div class="min-h-screen p-2">x</div>',
      parseSuccess: true,
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      costUsd: '0',
    })
    await executeAgentRun({
      runId: '550e8400-e29b-41d4-a716-446655440099',
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      phase: 3,
      agentType: 'generate_frame',
    })
    expect(appendFrameToCanvas).toHaveBeenCalledWith(
      '660e8400-e29b-41d4-a716-446655440001',
      { screenName: 'Home', html: '<div class="min-h-screen p-2">x</div>' },
      'Home',
      undefined,
    )
    expect(saveProjectPrototypeFile).toHaveBeenCalledWith(
      '660e8400-e29b-41d4-a716-446655440001',
      '/prototypes/Home.html',
      '<div class="min-h-screen p-2">x</div>',
      'html',
      'generate_frame',
      undefined,
    )
  })

  it('executeAgentRun marks failed and rethrows on error', async () => {
    getAgent.mockReturnValue({
      agentType: 'idea_analyzer',
      phase: 1,
      getAgentTask: () => 't',
      run: vi.fn().mockRejectedValue(new Error('rate_limit exceeded')),
    } as never)
    await expect(
      executeAgentRun({
        runId: '550e8400-e29b-41d4-a716-446655440099',
        projectId: '660e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        phase: 1,
        agentType: 'idea_analyzer',
      }),
    ).rejects.toThrow('rate_limit')
    expect(updateAgentRunStatus).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440099',
      expect.objectContaining({ status: 'failed', errorCode: 'PROVIDER_RATE_LIMIT' }),
    )
    expect(publishStreamEvent).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440099',
      'error',
      expect.any(Object),
    )
  })

  it('executeAgentRun merges phase 1 output when saving market_research', async () => {
    fetchProjectContext.mockResolvedValue({
      projectId: 'p',
      projectName: 'P',
      currentPhase: 1,
      phase1Output: {
        problem: 'Pain X',
        solution: 'Fix Y',
        icp: { description: 'Solo founders' },
      } as never,
    })
    mockAgent('market_research', {
      outputData: { verdict: 'yes', demandScore: 70 },
      rawText: '{}',
      parseSuccess: true,
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      costUsd: '0',
    })
    await executeAgentRun({
      runId: '550e8400-e29b-41d4-a716-446655440099',
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      phase: 1,
      agentType: 'market_research',
    })
    expect(saveAgentOutputToProject).toHaveBeenCalledWith(
      '660e8400-e29b-41d4-a716-446655440001',
      1,
      expect.objectContaining({
        problem: 'Pain X',
        verdict: 'yes',
      }),
      'market_research',
      undefined,
    )
  })

  it('executeAgentRun merges prior phase 2 output when saving system_design', async () => {
    fetchProjectContext.mockResolvedValue({
      projectId: 'p',
      projectName: 'P',
      currentPhase: 2,
      phase2Output: {
        features: [{ name: 'Auth', priority: 'must', description: 'Login' }],
      } as never,
    })
    mockAgent('system_design', {
      outputData: { frontendStack: 'Next.js 15', apiEndpoints: [] },
      rawText: '{}',
      parseSuccess: true,
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      costUsd: '0',
    })
    await executeAgentRun({
      runId: '550e8400-e29b-41d4-a716-446655440099',
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      phase: 2,
      agentType: 'system_design',
    })
    expect(saveAgentOutputToProject).toHaveBeenCalledWith(
      '660e8400-e29b-41d4-a716-446655440001',
      2,
      expect.objectContaining({
        features: [{ name: 'Auth', priority: 'must', description: 'Login' }],
        frontendStack: 'Next.js 15',
      }),
      'system_design',
      undefined,
    )
  })

  it("executeAgentRun publishes 'doc_mode' stream event for RAG-eligible agents", async () => {
    resolveDocumentContext.mockResolvedValue({
      mode: 'direct',
      content: 'x',
      tokenCount: 10,
      docCount: 2,
      wasCompressed: false,
      ragUsed: false,
    })
    mockAgent('market_research', {
      outputData: {},
      rawText: '{}',
      parseSuccess: true,
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      costUsd: '0',
    })
    await executeAgentRun({
      runId: '550e8400-e29b-41d4-a716-446655440099',
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      phase: 1,
      agentType: 'market_research',
    })
    expect(publishStreamEvent).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440099',
      'doc_mode',
      expect.objectContaining({ mode: 'direct', docCount: 2 }),
    )
  })
})
