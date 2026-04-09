import { Hono } from 'hono'

import { serviceRegistry } from '../config/serviceRegistry.js'
import { createJwtVerify } from '../middleware/jwtVerify.js'
import { createCircuitBreaker } from '../middleware/circuitBreaker.js'
import { aiRateLimiter, generalRateLimiter } from '../middleware/rateLimiter.js'
import { buildUpstreamUrl, proxyRequest } from '../lib/proxy.js'

const ai = new Hono()
const jwt = createJwtVerify()
// AI circuit breaker has a 120 s timeout (long LLM calls)
const cb = createCircuitBreaker('ai')

function upstream(c: Parameters<typeof buildUpstreamUrl>[0]): string {
  return buildUpstreamUrl(c, serviceRegistry.ai)
}

// ── All AI routes require a valid JWT ─────────────────────────────────────────
ai.use('/*', jwt)

// Run management
ai.post('/runs', aiRateLimiter, async (c) => {
  return cb.fire(() => proxyRequest(c, upstream(c)))
})

ai.get('/runs', generalRateLimiter, async (c) => {
  return cb.fire(() => proxyRequest(c, upstream(c)))
})

ai.get('/runs/:runId', generalRateLimiter, async (c) => {
  return cb.fire(() => proxyRequest(c, upstream(c)))
})

ai.delete('/runs/:runId', generalRateLimiter, async (c) => {
  return cb.fire(() => proxyRequest(c, upstream(c)))
})

ai.post('/runs/:runId/retry', aiRateLimiter, async (c) => {
  return cb.fire(() => proxyRequest(c, upstream(c)))
})

ai.get('/runs/:runId/output', generalRateLimiter, async (c) => {
  return cb.fire(() => proxyRequest(c, upstream(c)))
})

/**
 * GET /ai/runs/:runId/stream
 * Server-Sent Events (SSE) — 120 s timeout, no buffering, no rate limiting on
 * the stream itself (start-run endpoint is rate-limited).
 */
ai.get('/runs/:runId/stream', async (c) => {
  const url = upstream(c)
  return cb.fire(() => proxyRequest(c, url, { streaming: true }))
})

// Direct chat & utilities
ai.post('/chat', aiRateLimiter, async (c) => {
  return cb.fire(() => proxyRequest(c, upstream(c)))
})

ai.get('/models', generalRateLimiter, async (c) => {
  return cb.fire(() => proxyRequest(c, upstream(c)))
})

ai.get('/usage', generalRateLimiter, async (c) => {
  return cb.fire(() => proxyRequest(c, upstream(c)))
})

export { ai as aiRoutes }
