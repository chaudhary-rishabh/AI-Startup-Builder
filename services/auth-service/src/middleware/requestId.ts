import type { MiddlewareHandler } from 'hono'
import { randomUUID } from 'node:crypto'

export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const id = randomUUID()
  c.set('requestId' as never, id)
  await next()
  c.header('X-Request-ID', id)
}
