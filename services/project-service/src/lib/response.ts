import type {
  ErrorResponse,
  PaginationMeta,
  SuccessResponse,
  ValidationErrorDetail,
} from '@repo/types'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { randomUUID } from 'node:crypto'

export function ok<T>(c: Context, data: T, meta?: PaginationMeta): Response {
  const requestId = (c.get('requestId' as never) as string | undefined) ?? randomUUID()
  const timestamp = new Date().toISOString()
  const body: SuccessResponse<T> =
    meta !== undefined
      ? { success: true, data, meta, requestId, timestamp }
      : { success: true, data, requestId, timestamp }
  return c.json(body, 200)
}

export function created<T>(c: Context, data: T): Response {
  const body: SuccessResponse<T> = {
    success: true,
    data,
    requestId: (c.get('requestId' as never) as string | undefined) ?? randomUUID(),
    timestamp: new Date().toISOString(),
  }
  return c.json(body, 201)
}

export function accepted<T>(c: Context, data: T): Response {
  const body: SuccessResponse<T> = {
    success: true,
    data,
    requestId: (c.get('requestId' as never) as string | undefined) ?? randomUUID(),
    timestamp: new Date().toISOString(),
  }
  return c.json(body, 202)
}

export function err(
  c: Context,
  status: number,
  code: string,
  message: string,
  details?: ValidationErrorDetail[],
): Response {
  const traceId = (c.get('requestId' as never) as string | undefined) ?? randomUUID()
  const body: ErrorResponse =
    details !== undefined
      ? {
          success: false,
          error: { code, message, details, traceId, service: 'project-service' },
        }
      : {
          success: false,
          error: { code, message, traceId, service: 'project-service' },
        }
  return c.json(body, status as ContentfulStatusCode)
}
