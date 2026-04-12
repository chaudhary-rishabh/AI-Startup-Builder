import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

import { env } from '../config/env.js'
import { getRedis } from '../services/redis.service.js'

export interface ExportJobData {
  jobId: string
  projectId: string
  userId: string
  format: 'zip' | 'docx' | 'pdf'
  includePhases: number[]
}

const isVitest = process.env.VITEST === 'true'

function createQueueConnection(): Redis {
  if (isVitest) {
    return getRedis() as Redis
  }
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
}

let queueInstance: Queue<ExportJobData> | undefined
let queueConnection: Redis | undefined

function getQueue(): Queue<ExportJobData> {
  if (!queueInstance) {
    queueConnection = createQueueConnection()
    queueInstance = new Queue<ExportJobData>('project-exports', {
      connection: queueConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    })
  }
  return queueInstance
}

export const exportQueue = {
  add: (...args: Parameters<Queue<ExportJobData>['add']>) => getQueue().add(...args),
  close: async () => {
    if (queueInstance) await queueInstance.close()
  },
}

export async function closeExportQueue(): Promise<void> {
  if (queueInstance) {
    await queueInstance.close()
    queueInstance = undefined
  }
  if (queueConnection && !isVitest) {
    await queueConnection.quit()
    queueConnection = undefined
  }
}
