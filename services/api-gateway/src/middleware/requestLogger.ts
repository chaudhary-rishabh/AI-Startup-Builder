import type { MiddlewareHandler } from 'hono'
import { v4 as uuidv4 } from 'uuid'

import { logger } from '../observability/logger.js'

/**
 * Per-request middleware that:
 *   1. Generates a UUID request-id and stores it on Hono context
 *   2. Injects X-Request-ID into the response
 *   3. Logs request start and response completion with timing
 */
export const requestLogger: MiddlewareHandler = async (c, next) => {
  const requestId = uuidv4()
  c.set('requestId' as never, requestId)

  const startMs = Date.now()
  const ip =
    c.req.header('x-forwarded-for') ??
    c.req.header('x-real-ip') ??
    'unknown'

  logger.info({
    event: 'request_start',
    requestId,
    method: c.req.method,
    path: c.req.path,
    ip,
  })

  await next()

  const durationMs = Date.now() - startMs

  c.res.headers.set('X-Request-ID', requestId)

  logger.info({
    event: 'request_complete',
    requestId,
    method: c.req.method,
    path: c.req.path,
    statusCode: c.res.status,
    durationMs,
  })
}
