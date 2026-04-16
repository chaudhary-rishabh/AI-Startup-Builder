import { Worker } from 'bullmq'

import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'
import { createInAppNotification } from '../services/inApp.service.js'

let worker: Worker | null = null

export function startNotificationWorker(): Worker {
  if (worker) return worker
  worker = new Worker(
    'in-app-notifications',
    async (job) => {
      try {
        await createInAppNotification(job.data as {
          userId: string
          type: string
          title: string
          body: string
          actionUrl?: string
          metadata?: Record<string, unknown>
        })
      } catch (error) {
        logger.error('Notification worker job failed', { error, jobId: job.id })
      }
    },
    {
      connection: {
        host: new URL(env.REDIS_URL).hostname,
        port: Number(new URL(env.REDIS_URL).port || 6379),
      },
      concurrency: env.NOTIFICATION_WORKER_CONCURRENCY,
    },
  )
  worker.on('failed', (job, error) => {
    logger.error('Notification worker failed', { jobId: job?.id, error })
  })
  return worker
}
