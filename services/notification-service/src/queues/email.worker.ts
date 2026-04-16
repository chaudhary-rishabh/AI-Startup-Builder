import { Worker } from 'bullmq'

import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'
import { sendEmail } from '../services/resend.service.js'

let worker: Worker | null = null

export function startEmailWorker(): Worker {
  if (worker) return worker
  worker = new Worker(
    'email-delivery',
    async (job) => {
      try {
        const payload = job.data as {
          to: string
          userId?: string
          template?: string | null
          props?: Record<string, unknown>
        }
        await sendEmail({
          to: payload.to,
          ...(payload.userId !== undefined ? { userId: payload.userId } : {}),
          template: payload.template ?? 'admin_plain',
          props: payload.props ?? {},
        })
      } catch (error) {
        logger.error('Email worker job failed', { error, jobId: job.id })
        throw error
      }
    },
    {
      connection: {
        host: new URL(env.REDIS_URL).hostname,
        port: Number(new URL(env.REDIS_URL).port || 6379),
      },
      concurrency: env.EMAIL_WORKER_CONCURRENCY,
    },
  )
  worker.on('failed', (job, error) => {
    logger.error('Email worker failed', { jobId: job?.id, error })
  })
  return worker
}
