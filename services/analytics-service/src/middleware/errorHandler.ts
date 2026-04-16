import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'

import { env } from '../config/env.js'
import { AppError } from '../lib/errors.js'
import { err } from '../lib/response.js'

export function errorHandler(unknownErr: unknown, c: Context): Response {
  if (unknownErr instanceof ZodError) {
    return err(c, 422, 'VALIDATION_ERROR', 'Request validation failed')
  }
  if (unknownErr instanceof AppError) {
    return err(c, unknownErr.status, unknownErr.code, unknownErr.message)
  }
  if (unknownErr instanceof HTTPException) {
    const response = unknownErr.getResponse()
    const message = typeof unknownErr.message === 'string' ? unknownErr.message : 'Request failed'
    return err(c, response.status, 'HTTP_ERROR', message)
  }
  if (env.NODE_ENV !== 'production') {
    console.error('[analytics-service] Unhandled error', unknownErr)
  }
  const message = unknownErr instanceof Error ? unknownErr.message : 'Internal server error'
  return err(c, 500, 'INTERNAL_ERROR', env.NODE_ENV === 'production' ? 'An unexpected error occurred' : message)
}
