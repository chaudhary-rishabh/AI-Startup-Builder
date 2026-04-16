import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'

import { errorHandler } from './middleware/errorHandler.js'
import { requestIdMiddleware } from './middleware/requestId.js'
import adminRoutes from './routes/admin.routes.js'
import documentsRoutes from './routes/documents.routes.js'
import namespaceRoutes from './routes/namespace.routes.js'
import queryRoutes from './routes/query.routes.js'
import { readyHandler } from './ready.js'

export function createApp(): Hono {
  const app = new Hono()
  app.use('*', honoLogger())
  app.use('*', secureHeaders())
  app.use(
    '*',
    cors({
      origin:
        process.env['NODE_ENV'] === 'production' ? ['https://app.aistartupbuilder.com'] : '*',
      credentials: true,
    }),
  )
  app.use('*', requestIdMiddleware)

  app.get('/health', (c) =>
    c.json({
      status: 'ok',
      service: 'rag-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    }),
  )
  app.get('/ready', readyHandler)

  app.route('/', documentsRoutes)
  app.route('/', queryRoutes)
  app.route('/', namespaceRoutes)
  app.route('/', adminRoutes)

  app.onError(errorHandler)
  app.notFound((c) =>
    c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${c.req.path} not found`,
          service: 'rag-service',
        },
      },
      404,
    ),
  )
  return app
}

export default createApp()
