import { Queue } from 'bullmq'

import { env } from '../config/env.js'

export const notificationQueue = new Queue('in-app-notifications', {
  connection: {
    host: new URL(env.REDIS_URL).hostname,
    port: Number(new URL(env.REDIS_URL).port || 6379),
  },
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 3_000 },
    removeOnComplete: { count: 1_000 },
  },
})
