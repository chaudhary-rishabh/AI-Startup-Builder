import { Hono } from 'hono'

import { corsMiddleware } from './middleware/cors.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestIdMiddleware } from './middleware/requestId.js'
import { readyHandler } from './ready.js'
import conversationsRoutes from './routes/conversations.routes.js'
import projectsRoutes from './routes/projects.routes.js'

export function createApp(): Hono {
  const app = new Hono()
  app.use('*', requestIdMiddleware)
  app.use('*', corsMiddleware)
  app.route('/projects', conversationsRoutes)
  app.route('/projects', projectsRoutes)
  app.get('/health', (c) => c.json({ status: 'ok', service: 'project-service' }))
  app.get('/ready', readyHandler)
  app.onError(errorHandler)
  return app
}
