import { Hono } from 'hono'

import { errorHandler } from './middleware/errorHandler.js'
import { requestIdMiddleware } from './middleware/requestId.js'
import adminRoutes from './routes/admin.routes.js'
import documentsRoutes from './routes/documents.routes.js'
import namespaceRoutes from './routes/namespace.routes.js'
import queryRoutes from './routes/query.routes.js'
import { readyHandler } from './ready.js'

export function createApp(): Hono {
  const app = new Hono()
  app.use('*', requestIdMiddleware)

  app.get('/health', (c) => c.json({ status: 'ok', service: 'rag-service' }))
  app.get('/ready', readyHandler)

  app.route('/', documentsRoutes)
  app.route('/', queryRoutes)
  app.route('/', namespaceRoutes)
  app.route('/', adminRoutes)

  app.onError(errorHandler)
  return app
}
