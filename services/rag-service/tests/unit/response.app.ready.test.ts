import { randomUUID } from 'node:crypto'

import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { ok, accepted, err } from '../../src/lib/response.js'
import { errorHandler } from '../../src/middleware/errorHandler.js'
import { AppError } from '../../src/lib/errors.js'
import { z } from 'zod'

describe('createApp', () => {
  it('GET /health returns rag-service ok', async () => {
    const app = createApp()
    const res = await app.request('http://localhost/health')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; service: string; version: string; timestamp: string }
    expect(body.status).toBe('ok')
    expect(body.service).toBe('rag-service')
    expect(body.version).toBe('1.0.0')
    expect(typeof body.timestamp).toBe('string')
  })
})

describe('response helpers', () => {
  it('ok, accepted, and err shape responses', async () => {
    const app = new Hono()
    app.get('/o', (c) => ok(c, { n: 1 }))
    app.get('/om', (c) => ok(c, { n: 1 }, { page: 1, limit: 10, total: 50 }))
    app.get('/a', (c) => accepted(c, { job: 'x' }))
    app.get('/e', (c) => err(c, 400, 'BAD', 'nope'))
    app.get('/ed', (c) =>
      err(c, 422, 'VALIDATION_ERROR', 'bad', [{ field: 'x', message: 'm', received: 1 }]),
    )

    const r1 = await app.request('http://x/o')
    expect(r1.status).toBe(200)
    const j1 = (await r1.json()) as { success: boolean; data: { n: number }; meta?: unknown }
    expect(j1.success).toBe(true)
    expect(j1.data.n).toBe(1)
    expect(j1.meta).toBeUndefined()

    const r2 = await app.request('http://x/om')
    const j2 = (await r2.json()) as { meta: { page: number } }
    expect(j2.meta.page).toBe(1)

    const r3 = await app.request('http://x/a')
    expect(r3.status).toBe(202)

    const r4 = await app.request('http://x/e')
    expect(r4.status).toBe(400)
    const j4 = (await r4.json()) as { success: boolean }
    expect(j4.success).toBe(false)

    const r5 = await app.request('http://x/ed')
    const j5 = (await r5.json()) as { error: { details?: unknown[] } }
    expect(j5.error.details?.length).toBe(1)
  })
})

describe('errorHandler', () => {
  it('handles AppError, ZodError, and generic errors', async () => {
    const app = new Hono()
    app.onError(errorHandler)
    app.use('*', async (c, next) => {
      c.set('requestId' as never, randomUUID())
      await next()
    })
    app.get('/a', () => {
      throw new AppError('X', 'msg', 418)
    })
    app.get('/z', () => {
      z.object({ a: z.string() }).parse({ a: 1 })
    })
    app.get('/g', () => {
      throw new Error('surprise')
    })

    const ra = await app.request('http://t/a')
    expect(ra.status).toBe(418)

    const rz = await app.request('http://t/z')
    expect(rz.status).toBe(422)

    const rg = await app.request('http://t/g')
    expect(rg.status).toBe(500)
  })
})
