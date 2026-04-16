import { pathToFileURL } from 'node:url'

import { serve } from '@hono/node-server'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { sql } from 'drizzle-orm'

import app, { createApp } from './app.js'
import { env } from './config/env.js'
import { ensureAnalyticsConsumerGroup, startAnalyticsEventConsumer } from './events/consumer.js'
import { getDb } from './lib/db.js'
import { logger } from './lib/logger.js'
import { getReadReplica } from './lib/readReplica.js'
import { getRedis } from './lib/redis.js'

export { createApp }
export { env }

function shouldStartServer(): boolean {
  if (!process.argv[1]) return false
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href
  } catch {
    return false
  }
}

async function ensureFuturePartitions(): Promise<void> {
  const db = getDb()
  const now = new Date()
  for (let i = 0; i < 4; i += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1))
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth() + 1
    await db.execute(sql`SELECT analytics.create_monthly_partition(${year}, ${month})`)
  }
}

let weeklyDigestTimer: NodeJS.Timeout | null = null

function startWeeklyDigestScheduler(): void {
  if (!env.WEEKLY_DIGEST_ENABLED || weeklyDigestTimer) return
  weeklyDigestTimer = setInterval(() => {
    logger.info('Weekly digest scheduler tick')
  }, 7 * 24 * 60 * 60 * 1000)
}

if (shouldStartServer()) {
  void (async () => {
    void env

    const db = getDb()
    await db.execute(sql`SELECT 1`)
    logger.info('Primary database connected')

    const readReplica = getReadReplica()
    await readReplica.execute(sql`SELECT 1`)
    logger.info('Read replica connected')

    await migrate(db as never, { migrationsFolder: './src/db/migrations' })
    logger.info('Database migrations applied')

    await ensureFuturePartitions()
    logger.info('Future monthly partitions ensured')

    const redis = getRedis()
    await redis.ping()
    logger.info('Redis connected')

    await ensureAnalyticsConsumerGroup()
    void startAnalyticsEventConsumer()
    logger.info('Analytics event consumer started')

    startWeeklyDigestScheduler()

    serve({ fetch: app.fetch, port: env.PORT }, () => {
      logger.info(`analytics-service running on port ${env.PORT}`)
    })
  })().catch((error) => {
    logger.error('Startup failed', { error })
    process.exit(1)
  })
}
