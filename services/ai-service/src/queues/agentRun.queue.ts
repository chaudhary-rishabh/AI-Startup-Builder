import { Queue } from 'bullmq'

import { env } from '../config/env.js'

const connection = { url: env.REDIS_URL }

export const agentRunQueue = new Queue('agent-runs', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
})

export function getConcurrencyForPlan(plan: string): number {
  const p = plan.toLowerCase()
  if (p === 'enterprise') return env.AGENT_CONCURRENCY_ENTERPRISE
  if (p === 'pro') return env.AGENT_CONCURRENCY_PRO
  return env.AGENT_CONCURRENCY_FREE
}

export async function closeAgentRunQueue(): Promise<void> {
  await agentRunQueue.close()
}
