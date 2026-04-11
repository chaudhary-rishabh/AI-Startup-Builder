import { Hono } from 'hono'

import { corsMiddleware } from './middleware/cors.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestIdMiddleware } from './middleware/requestId.js'
import { readyHandler } from './ready.js'
import adminRoutes from './routes/admin.routes.js'
import apiKeysRoutes from './routes/apiKeys.routes.js'
import avatarRoutes from './routes/avatar.routes.js'
import integrationsRoutes from './routes/integrations.routes.js'
import onboardingRoutes from './routes/onboarding.routes.js'
import profileRoutes from './routes/profile.routes.js'

export function createApp(): Hono {
  const app = new Hono()
  app.use('*', requestIdMiddleware)
  app.use('*', corsMiddleware)
  app.route('/users', profileRoutes)
  app.route('/users', onboardingRoutes)
  app.route('/users', apiKeysRoutes)
  app.route('/users', avatarRoutes)
  app.route('/users', integrationsRoutes)
  app.route('/users', adminRoutes)
  app.get('/health', (c) => c.json({ status: 'ok', service: 'user-service' }))
  app.get('/ready', readyHandler)
  app.onError(errorHandler)
  return app
}
