import { Hono } from 'hono'

import { corsMiddleware } from './middleware/cors.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestIdMiddleware } from './middleware/requestId.js'
import adminRoutes from './routes/admin.routes.js'
import authRoutes from './routes/auth.routes.js'
import mfaRoutes from './routes/mfa.routes.js'
import oauthRoutes from './routes/oauth.routes.js'

export function createApp(): Hono {
  const app = new Hono()
  app.use('*', requestIdMiddleware)
  app.use('*', corsMiddleware)
  app.route('/auth', authRoutes)
  app.route('/auth', oauthRoutes)
  app.route('/auth', mfaRoutes)
  app.route('/admin', adminRoutes)
  app.onError(errorHandler)
  return app
}
