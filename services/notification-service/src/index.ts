import { pathToFileURL } from 'node:url'

import { serve } from '@hono/node-server'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { sql } from 'drizzle-orm'

import app, { createApp } from './app.js'
import { env } from './config/env.js'
import { ensureNotificationConsumerGroup, startNotificationEventConsumer } from './events/consumer.js'
import { getDb } from './lib/db.js'
import { logger } from './lib/logger.js'
import { getRedis } from './lib/redis.js'
import { startEmailWorker } from './queues/email.worker.js'
import { startNotificationWorker } from './queues/notification.worker.js'
import { verifyResendApiKey } from './services/resend.service.js'

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

if (shouldStartServer()) {
  void (async () => {
    void env
    const db = getDb()
    await db.execute(sql`SELECT 1`)
    logger.info('Database connected')

    const redis = getRedis()
    await redis.ping()
    logger.info('Redis connected')

    await migrate(db as never, { migrationsFolder: './src/db/migrations' })
    logger.info('Database migrations applied')

    try {
      await verifyResendApiKey()
      logger.info('Resend connectivity check completed')
    } catch (error) {
      logger.warn('Resend connectivity check failed', { error })
    }

    await ensureNotificationConsumerGroup()
    void startNotificationEventConsumer()
    logger.info('Event consumer started')

    startEmailWorker()
    startNotificationWorker()
    logger.info('Workers started')

    serve({ fetch: app.fetch, port: env.PORT }, () => {
      logger.info(`notification-service running on port ${env.PORT}`)
    })
  })().catch((error) => {
    logger.error('Startup failed', { error })
    process.exit(1)
  })
}
