import { pathToFileURL } from 'node:url'

import { serve } from '@hono/node-server'

import { createApp } from './app.js'
import { env } from './config/env.js'
import { stopConsumer, startEventConsumer } from './events/consumer.js'

export { env }
export { getDb, getReadDb } from './lib/db.js'
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
  const server = serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      console.log(`user-service started on port ${info.port}`)
      console.log('Event consumer started')
      void startEventConsumer().catch((e) => {
        console.error('[user-service] Event consumer exited unexpectedly:', e)
      })
    },
  )

  const shutdown = (signal: string) => {
    console.log(`[user-service] Received ${signal}, shutting down...`)
    stopConsumer()
    server.close((err) => {
      if (err) console.error('[user-service] HTTP server close error:', err)
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}
