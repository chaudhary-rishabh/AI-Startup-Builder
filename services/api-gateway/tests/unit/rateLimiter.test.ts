import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import RedisMock from 'ioredis-mock'

import { createRateLimiter } from '../../src/middleware/rateLimiter.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Each invocation of buildApp generates a unique keyFn prefix so that tests
// sharing the ioredis-mock global in-memory DB do not bleed into each other.
let _counter = 0

function buildApp(max: number, windowSecs: number) {
  const redis = new RedisMock()
  const prefix = `t${_counter++}`
  const app = new Hono()
  app.use(
    '/*',
    createRateLimiter({
      max,
      window: windowSecs,
      redis: redis as never,
      // Unique scope key per test invocation
      keyFn: (c) =>
        `${prefix}:ip:${c.req.header('x-forwarded-for') ?? 'unknown'}`,
    }),
  )
  app.get('/ping', (c) => c.json({ pong: true }))
  return { app, redis }
}

async function fire(app: Hono, n: number): Promise<Response[]> {
  const results: Response[] = []
  for (let i = 0; i < n; i++) {
    results.push(
      await app.request('/ping', {
        headers: { 'x-forwarded-for': '10.0.0.1' },
      }),
    )
  }
  return results
}

// ─────────────────────────────────────────────────────────────────────────────

describe('createRateLimiter', () => {
  it('requests within the limit pass through (200)', async () => {
    const { app } = buildApp(5, 60)
    const responses = await fire(app, 5)
    for (const res of responses) {
      expect(res.status).toBe(200)
    }
  })

  it('5th request on a max=5 limiter still passes', async () => {
    const { app } = buildApp(5, 60)
    const responses = await fire(app, 5)
    expect(responses[4]?.status).toBe(200)
  })

  it('6th request on a max=5 limiter returns 429', async () => {
    const { app } = buildApp(5, 60)
    const responses = await fire(app, 6)
    expect(responses[5]?.status).toBe(429)
  })

  it('429 response includes Retry-After header', async () => {
    const { app } = buildApp(3, 60)
    const responses = await fire(app, 4)
    const last = responses[3]!
    expect(last.status).toBe(429)
    expect(last.headers.get('Retry-After')).toBe('60')
  })

  it('429 response body has RATE_LIMIT_EXCEEDED error code', async () => {
    const { app } = buildApp(2, 60)
    const responses = await fire(app, 3)
    const body = await responses[2]!.json() as { error: { code: string } }
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('X-RateLimit-Limit header reflects the configured max', async () => {
    const { app } = buildApp(10, 60)
    const [first] = await fire(app, 1)
    expect(first!.headers.get('X-RateLimit-Limit')).toBe('10')
  })

  it('X-RateLimit-Remaining decrements with each request', async () => {
    const { app } = buildApp(5, 60)
    const responses = await fire(app, 3)
    // After 3 requests with max=5: remaining = 5 - 3 = 2
    expect(responses[2]!.headers.get('X-RateLimit-Remaining')).toBe('2')
  })

  it('user-keyed limiter uses userId not IP', async () => {
    const { app } = buildApp(5, 60)
    const res = await app.request('/ping')
    expect(res.status).toBe(200)
  })

  it('independent keys do not affect each other', async () => {
    const redis = new RedisMock()

    const limiterA = createRateLimiter({
      max: 2,
      window: 60,
      redis: redis as never,
      keyFn: () => 'scope:A:unique1',
    })
    const limiterB = createRateLimiter({
      max: 2,
      window: 60,
      redis: redis as never,
      keyFn: () => 'scope:B:unique1',
    })

    const appA = new Hono()
    appA.use('/*', limiterA)
    appA.get('/ping', (c) => c.json({ ok: true }))

    const appB = new Hono()
    appB.use('/*', limiterB)
    appB.get('/ping', (c) => c.json({ ok: true }))

    // Exhaust limiter A
    await fire(appA, 2)
    const overA = await appA.request('/ping')
    expect(overA.status).toBe(429)

    // Limiter B should still be fresh
    const underB = await appB.request('/ping')
    expect(underB.status).toBe(200)
  })
})
