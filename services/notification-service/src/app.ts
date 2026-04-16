import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'

import { errorHandler } from './middleware/errorHandler.js'
import { requestIdMiddleware } from './middleware/requestId.js'
import adminRoutes from './routes/admin.routes.js'
import notificationsRoutes from './routes/notifications.routes.js'
import preferencesRoutes from './routes/preferences.routes.js'

export function createApp(): Hono {
  const app = new Hono()
  app.use('*', honoLogger())
  app.use('*', secureHeaders())
  app.use(
    '*',
    cors({
      origin: process.env['NODE_ENV'] === 'production' ? ['https://app.aistartupbuilder.com'] : '*',
      credentials: true,
    }),
  )
  app.use('*', requestIdMiddleware)

  app.route('/notifications', notificationsRoutes)
  app.route('/notifications', preferencesRoutes)
  app.route('/notifications', adminRoutes)

  app.get('/health', (c) =>
    c.json({
      status: 'ok',
      service: 'notification-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    }),
  )
  app.onError(errorHandler)
  return app
}

export default createApp()
