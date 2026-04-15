import type { MiddlewareHandler } from 'hono'

import { err } from '../lib/response.js'

export const requireSuperAdmin: MiddlewareHandler = async (c, next) => {
  const role = c.get('userRole' as never) as string | undefined
  if (role !== 'super_admin') {
    return err(c, 403, 'FORBIDDEN', 'Super admin role required')
  }
  await next()
}
