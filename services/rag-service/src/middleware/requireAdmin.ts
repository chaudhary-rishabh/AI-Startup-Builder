import type { MiddlewareHandler } from 'hono'

import { err } from '../lib/response.js'

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const role = c.get('userRole')
  if (role !== 'super_admin') {
    return err(c, 403, 'FORBIDDEN', 'Admin access required')
  }
  await next()
}
