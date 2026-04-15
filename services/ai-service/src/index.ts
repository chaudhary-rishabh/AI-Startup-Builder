import { pathToFileURL } from 'node:url'

import { serve } from '@hono/node-server'

import { registerAllAgents } from './agents/index.js'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { startEventConsumer, stopConsumer } from './events/consumer.js'
import { closeDbPools } from './lib/db.js'
import { getRedis } from './lib/redis.js'
import { closeAgentRunQueue } from './queues/agentRun.queue.js'
import { shutdownAgentRunWorker, startAgentRunWorker } from './queues/agentRun.worker.js'

export { env }
export { getDb, closeDbPools } from './lib/db.js'
export * from './db/schema.js'
export { createApp }

function shouldStartServer(): boolean {
  if (!process.argv[1]) return false
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href
  } catch {
    return false
  }
}

if (shouldStartServer()) {
  registerAllAgents()
  const app = createApp()
  let worker: ReturnType<typeof startAgentRunWorker> | undefined

  const server = serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      console.log(`ai-service started on port ${info.port}`)
      void startEventConsumer().catch((e) => {
        console.error('[ai-service] Event consumer exited unexpectedly:', e)
      })
      worker = startAgentRunWorker()
      console.log('Agent run worker started')
    },
  )

  const shutdown = async (signal: string) => {
    console.log(`[ai-service] Received ${signal}, shutting down...`)
    stopConsumer()
    try {
      if (worker) await shutdownAgentRunWorker(worker)
      await closeAgentRunQueue()
      await getRedis().quit().catch(() => undefined)
      await closeDbPools()
    } catch (e) {
      console.error('[ai-service] Shutdown error', e)
    }
    server.close((err) => {
      if (err) console.error('[ai-service] HTTP server close error', err)
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })
}
