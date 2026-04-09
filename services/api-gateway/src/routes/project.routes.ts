import { Hono } from 'hono'

import { serviceRegistry } from '../config/serviceRegistry.js'
import { createJwtVerify } from '../middleware/jwtVerify.js'
import { createCircuitBreaker } from '../middleware/circuitBreaker.js'
import { generalRateLimiter } from '../middleware/rateLimiter.js'
import { buildUpstreamUrl, proxyRequest } from '../lib/proxy.js'

const project = new Hono()
const jwt = createJwtVerify()
const cb = createCircuitBreaker('project')

function upstream(c: Parameters<typeof buildUpstreamUrl>[0]): string {
  return buildUpstreamUrl(c, serviceRegistry.project)
}

async function proxy(c: Parameters<typeof proxyRequest>[0]): Promise<Response> {
  return cb.fire(() => proxyRequest(c, upstream(c)))
}

// ── All project routes require a valid JWT ────────────────────────────────────
project.use('/*', jwt)

// Project CRUD
project.get('/', generalRateLimiter, async (c) => proxy(c))
project.post('/', generalRateLimiter, async (c) => proxy(c))
project.get('/:id', generalRateLimiter, async (c) => proxy(c))
project.patch('/:id', generalRateLimiter, async (c) => proxy(c))
project.delete('/:id', generalRateLimiter, async (c) => proxy(c))

// Phase management
project.post('/:id/advance', generalRateLimiter, async (c) => proxy(c))
project.get('/:id/phase/:phase/output', generalRateLimiter, async (c) => proxy(c))
project.put('/:id/phase/:phase/output', generalRateLimiter, async (c) => proxy(c))

// Conversation
project.get('/:id/conversation', generalRateLimiter, async (c) => proxy(c))
project.post('/:id/conversation', generalRateLimiter, async (c) => proxy(c))

// Design canvas
project.get('/:id/canvas', generalRateLimiter, async (c) => proxy(c))
project.put('/:id/canvas', generalRateLimiter, async (c) => proxy(c))

// Export — no rate limit counting on polling
project.post('/:id/export', generalRateLimiter, async (c) => proxy(c))
project.get('/:id/export/:exportId/status', async (c) => proxy(c))

// Duplication
project.post('/:id/duplicate', generalRateLimiter, async (c) => proxy(c))

export { project as projectRoutes }
