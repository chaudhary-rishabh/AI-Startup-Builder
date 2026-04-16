import { randomUUID } from 'node:crypto'

import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export function ok<T>(c: Context, data: T): Response {
  const requestId = (c.get('requestId' as never) as string | undefined) ?? randomUUID()
  return c.json(
    {
      success: true,
      data,
      requestId,
      timestamp: new Date().toISOString(),
    },
    200,
  )
}

export function accepted<T>(c: Context, data: T): Response {
  const requestId = (c.get('requestId' as never) as string | undefined) ?? randomUUID()
  return c.json(
    {
      success: true,
      data,
      requestId,
      timestamp: new Date().toISOString(),
    },
    202,
  )
}

export function err(c: Context, status: number, code: string, message: string): Response {
  const traceId = (c.get('requestId' as never) as string | undefined) ?? randomUUID()
  return c.json(
    {
      success: false,
      error: { code, message, traceId, service: 'notification-service' },
    },
    status as ContentfulStatusCode,
  )
}
