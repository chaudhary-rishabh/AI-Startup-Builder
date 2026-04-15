import { Worker } from 'bullmq'

import { env } from '../config/env.js'
import { executeAgentRun } from '../services/agentOrchestrator.service.js'

import type { AgentType } from '@repo/types'

export interface AgentRunJobData {
  runId: string
  projectId: string
  userId: string
  phase: number
  agentType: AgentType
  userMessage?: string
  requestId?: string
  authorization?: string
}

export function startAgentRunWorker(): Worker<AgentRunJobData> {
  return new Worker<AgentRunJobData>(
    'agent-runs',
    async (job) => {
      await executeAgentRun(job.data)
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: 10,
      limiter: { max: 5, duration: 1000 },
    },
  )
}

export async function shutdownAgentRunWorker(worker: Worker): Promise<void> {
  await worker.close()
}
