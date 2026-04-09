import { pathToFileURL } from 'node:url'

import { serve } from '@hono/node-server'

import { env } from './config/env.js'
import { createApp } from './app.js'

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
  serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      console.log(
        JSON.stringify({
          service: 'auth-service',
          port: info.port,
          env: env.NODE_ENV,
        }),
      )
    },
  )
}
