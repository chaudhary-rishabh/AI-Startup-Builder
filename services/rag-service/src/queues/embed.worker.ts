import { Worker } from 'bullmq'

import { publishDocumentIndexingFailed } from '../events/publisher.js'
import { updateDocumentStatus } from '../db/queries/ragDocuments.queries.js'
import { getRedis } from '../lib/redis.js'
import { classifyIngestError, runIngestionPipeline } from '../services/ingest.service.js'
import { logger } from '../lib/logger.js'

import type { IngestJobData } from '../services/ingest.service.js'

let worker: Worker | null = null

export function startEmbedWorker(): Worker {
  if (worker) return worker
  worker = new Worker(
    'embed-documents',
    async (job) => {
      await runIngestionPipeline(job.data as IngestJobData)
    },
    { connection: getRedis(), concurrency: 3 },
  )

  worker.on('failed', async (job, err) => {
    const maxAttempts = (job?.opts.attempts as number | undefined) ?? 3
    if (job && job.attemptsMade >= maxAttempts) {
      await updateDocumentStatus(job.data.docId, {
        status: 'failed',
        errorMessage: classifyIngestError(err),
      })
      await publishDocumentIndexingFailed({
        userId: job.data.userId,
        docId: job.data.docId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  })

  worker.on('completed', (job) => {
    logger.info('Document indexed successfully', {
      docId: job.data.docId,
      userId: job.data.userId,
    })
  })

  return worker
}

export async function closeEmbedWorker(): Promise<void> {
  if (worker) {
    await worker.close()
    worker = null
  }
}
