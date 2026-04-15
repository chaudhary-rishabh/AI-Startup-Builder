import { getRedis } from '../lib/redis.js'

const STREAM_KEY = 'platform:events'

export async function publishEvent<T extends Record<string, unknown>>(
  type: string,
  payload: T,
): Promise<void> {
  const redis = getRedis()
  await redis.xadd(
    STREAM_KEY,
    'MAXLEN',
    '~',
    '100000',
    '*',
    'type',
    type,
    'payload',
    JSON.stringify(payload),
    'timestamp',
    new Date().toISOString(),
    'source',
    'ai-service',
    'version',
    '1',
  )
}

export async function publishAgentRunCompleted(
  runId: string,
  projectId: string,
  userId: string,
  phase: number,
  agentType: string,
  outputData: Record<string, unknown>,
  tokensUsed: number,
  durationMs: number,
  model: string,
): Promise<void> {
  await publishEvent('agent.run_completed', {
    runId,
    projectId,
    userId,
    phase,
    agentType,
    outputData,
    tokensUsed,
    durationMs,
    model,
    completedAt: new Date().toISOString(),
  } as Record<string, unknown>)
}

export async function publishTokenBudgetWarning(
  userId: string,
  percentUsed: 80 | 95,
  tokensUsed: number,
  tokenLimit: number,
): Promise<void> {
  await publishEvent('token.budget_warning', {
    userId,
    percentUsed,
    tokensUsed,
    tokenLimit,
    at: new Date().toISOString(),
  } as Record<string, unknown>)
}
