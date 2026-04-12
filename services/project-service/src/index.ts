import { pathToFileURL } from 'node:url'

import { serve } from '@hono/node-server'

import { createApp } from './app.js'
import { env } from './config/env.js'
import { startEventConsumer, stopConsumer } from './events/consumer.js'
import { closeExportQueue } from './queues/export.queue.js'
import { shutdownExportWorker, startExportWorker } from './queues/export.worker.js'

export { env }
export { getDb, getReadDb, closeDbPools } from './lib/db.js'
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
  const app = createApp()
  let exportWorker: ReturnType<typeof startExportWorker> | undefined

  const server = serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      console.log(`project-service started on port ${info.port}`)
      console.log('Event consumer started')
      void startEventConsumer().catch((e) => {
        console.error('[project-service] Event consumer exited unexpectedly:', e)
      })
      exportWorker = startExportWorker()
      console.log('Export worker started, concurrency: 3')
    },
  )

  const shutdown = async (signal: string) => {
    console.log(`[project-service] Received ${signal}, shutting down...`)
    stopConsumer()
    try {
      if (exportWorker) await shutdownExportWorker(exportWorker)
      await closeExportQueue()
    } catch (e) {
      console.error('[project-service] Export shutdown error:', e)
    }
    server.close((err) => {
      if (err) console.error('[project-service] HTTP server close error:', err)
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
