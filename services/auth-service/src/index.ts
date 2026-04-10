import { pathToFileURL } from 'node:url'

import { serve } from '@hono/node-server'

import { env } from './config/env.js'
import { createApp } from './app.js'
import { startEventConsumer, stopConsumer } from './events/consumer.js'
import { startCleanupJob, stopCleanupJob } from './jobs/cleanupExpiredTokens.job.js'

export { env }
export { getDb, getReadDb } from './lib/db.js'
export * from './db/schema.js'
export { createApp }

let cleanupJobHandle: NodeJS.Timeout | undefined

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
  const server = serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      console.log(`auth-service started on port ${info.port}`)
      console.log('Event consumer started')
      void startEventConsumer().catch((e) => {
        console.error('[auth-service] Event consumer exited unexpectedly:', e)
      })
      console.log('cleanup_expired_tokens job started')
      cleanupJobHandle = startCleanupJob()
    },
  )

  const shutdown = (signal: string) => {
    console.log(`[auth-service] Received ${signal}, shutting down...`)
    stopConsumer()
    if (cleanupJobHandle) stopCleanupJob(cleanupJobHandle)
    server.close((err) => {
      if (err) console.error('[auth-service] HTTP server close error:', err)
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}
