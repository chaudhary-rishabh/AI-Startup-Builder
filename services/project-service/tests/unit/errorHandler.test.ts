import { describe, expect, it } from 'vitest'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'

import { errorHandler } from '../../src/middleware/errorHandler.js'

describe('errorHandler', () => {
  it('maps ZodError to 422', () => {
    const parseResult = z.object({ a: z.string() }).safeParse({})
    expect(parseResult.success).toBe(false)
    if (parseResult.success) return
    const c = {
      get: () => undefined,
      json: (body: unknown, status?: number) =>
        new Response(JSON.stringify(body), { status: status ?? 200 }),
    }
    const res = errorHandler(parseResult.error, c as never)
    expect(res.status).toBe(422)
  })

  it('maps HTTPException using status from response', () => {
    const ex = new HTTPException(418, { message: 'teapot' })
    const c = {
      get: () => undefined,
      json: (body: unknown, status?: number) =>
        new Response(JSON.stringify(body), { status: status ?? 200 }),
    }
    const res = errorHandler(ex, c as never)
    expect(res.status).toBe(418)
  })

  it('maps unknown Error to 500 in test env', () => {
    const c = {
      get: () => undefined,
      json: (body: unknown, status?: number) =>
        new Response(JSON.stringify(body), { status: status ?? 200 }),
    }
    const res = errorHandler(new Error('boom'), c as never)
    expect(res.status).toBe(500)
  })
})
