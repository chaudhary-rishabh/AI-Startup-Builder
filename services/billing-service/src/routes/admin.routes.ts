import { Hono } from 'hono'

import { requireAdmin } from '../middleware/requireAdmin.js'
import { requireAuth } from '../middleware/requireAuth.js'

const routes = new Hono()
routes.use('*', requireAuth)
routes.use('*', requireAdmin)

routes.get('/admin/revenue', (c) => {
  return c.json({ success: false, message: 'Implemented in P29' }, 501)
})

routes.post('/admin/refund', (c) => {
  return c.json({ success: false, message: 'Implemented in P29' }, 501)
})

export default routes
