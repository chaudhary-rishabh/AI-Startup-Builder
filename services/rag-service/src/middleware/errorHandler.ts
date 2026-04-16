import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'

import { env } from '../config/env.js'
import { AppError } from '../lib/errors.js'
import { err } from '../lib/response.js'

export function errorHandler(unknownErr: unknown, c: Context): Response {
  const requestId = (c.get('requestId') as string | undefined) ?? ''

  if (unknownErr instanceof ZodError) {
    const details = unknownErr.issues.map((issue) => ({
      field: issue.path.join('.') || '(root)',
      message: issue.message,
      received: 'received' in issue ? (issue as { received?: unknown }).received : undefined,
    }))
    return err(c, 422, 'VALIDATION_ERROR', 'Request validation failed', details)
  }

  if (unknownErr instanceof AppError) {
    return err(c, unknownErr.status, unknownErr.code, unknownErr.message)
  }

  if (unknownErr instanceof HTTPException) {
    const res = unknownErr.getResponse()
    const msg = typeof unknownErr.message === 'string' ? unknownErr.message : 'Request failed'
    return err(c, res.status, 'HTTP_ERROR', msg)
  }

  const message = unknownErr instanceof Error ? unknownErr.message : 'Internal server error'
  console.error('[rag-service] Unhandled error', {
    requestId,
    message,
    ...(env.NODE_ENV !== 'production' && unknownErr instanceof Error
      ? { stack: unknownErr.stack }
      : {}),
  })

  return err(
    c,
    500,
    'INTERNAL_ERROR',
    env.NODE_ENV === 'production' ? 'An unexpected error occurred' : message,
  )
}
