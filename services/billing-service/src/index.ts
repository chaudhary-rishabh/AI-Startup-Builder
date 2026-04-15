import { pathToFileURL } from 'node:url'

import { serve } from '@hono/node-server'

import { createApp } from './app.js'
import { env } from './config/env.js'

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
  const app = createApp()
  serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      console.log(`billing-service started on port ${info.port}`)
    },
  )
}
