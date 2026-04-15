import { Hono } from 'hono'

import internalRoutes from './routes/internal.routes.js'

export function createApp(): Hono {
  const app = new Hono()
  app.route('/internal', internalRoutes)
  app.get('/health', (c) => c.json({ status: 'ok', service: 'billing-service' }))
  return app
}
