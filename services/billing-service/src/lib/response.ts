import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { randomUUID } from 'node:crypto'

export function ok<T>(c: Context, data: T): Response {
  return c.json(
    {
      success: true,
      data,
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
    },
    200,
  )
}

export function err(
  c: Context,
  status: number,
  code: string,
  message: string,
): Response {
  return c.json(
    {
      success: false,
      error: { code, message, traceId: randomUUID(), service: 'billing-service' },
    },
    status as ContentfulStatusCode,
  )
}
