import { Queue } from 'bullmq'

import { getRedis } from '../lib/redis.js'

import type { IngestJobData } from '../services/ingest.service.js'
import type { Job } from 'bullmq'

export const embedDocumentsQueue = new Queue('embed-documents', {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 15_000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  },
})

export type EnqueueIngestPayload = IngestJobData & { plan?: string }

export async function enqueueIngestJob(data: EnqueueIngestPayload): Promise<Job> {
  const priority = data.plan === 'enterprise' ? 10 : data.plan === 'pro' ? 5 : 1
  const { plan: _plan, ...jobData } = data
  return embedDocumentsQueue.add('ingest', jobData, {
    jobId: `ingest:${data.docId}`,
    priority,
  })
}

export async function closeEmbedQueue(): Promise<void> {
  await embedDocumentsQueue.close()
}
