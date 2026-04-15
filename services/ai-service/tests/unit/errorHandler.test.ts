import { describe, expect, it } from 'vitest'
import { HTTPException } from 'hono/http-exception'
import { Hono } from 'hono'
import { ZodError, z } from 'zod'

import { errorHandler } from '../../src/middleware/errorHandler.js'

describe('errorHandler', () => {
  it('maps ZodError to 422', async () => {
    const app = new Hono()
    app.onError(errorHandler)
    app.get('/t', () => {
      z.object({ x: z.string() }).parse({})
      return new Response('ok')
    })
    const res = await app.request('http://localhost/t')
    expect(res.status).toBe(422)
  })

  it('maps HTTPException', async () => {
    const app = new Hono()
    app.onError(errorHandler)
    app.get('/t', () => {
      throw new HTTPException(400, { message: 'bad' })
    })
    const res = await app.request('http://localhost/t')
    expect(res.status).toBe(400)
  })
})
