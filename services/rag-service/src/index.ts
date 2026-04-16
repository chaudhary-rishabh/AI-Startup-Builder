import { serve } from '@hono/node-server'

import { createApp } from './app.js'
import { env } from './config/env.js'
import { startRagEventConsumer } from './events/consumer.js'
import { logger } from './lib/logger.js'
import { startEmbedWorker } from './queues/embed.worker.js'

const app = createApp()

if (process.env['RAG_EMBED_WORKER'] !== '0') {
  startEmbedWorker()
}

if (process.env['RAG_EVENT_CONSUMER'] !== '0') {
  void startRagEventConsumer()
}

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info(`rag-service listening on ${info.address}:${info.port}`)
})
