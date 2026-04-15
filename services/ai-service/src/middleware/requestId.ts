import type { MiddlewareHandler } from 'hono'
import { randomUUID } from 'node:crypto'

export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const id = c.req.header('X-Request-ID') ?? randomUUID()
  c.set('requestId' as never, id)
  c.header('X-Request-ID', id)
  await next()
}
