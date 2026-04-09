import { Hono } from 'hono'

import { serviceRegistry } from '../config/serviceRegistry.js'
import { createJwtVerify } from '../middleware/jwtVerify.js'
import { createCircuitBreaker } from '../middleware/circuitBreaker.js'
import { generalRateLimiter, createRateLimiter } from '../middleware/rateLimiter.js'
import { buildUpstreamUrl, proxyRequest } from '../lib/proxy.js'

const user = new Hono()
const jwt = createJwtVerify()
const cb = createCircuitBreaker('user')

// Tighter limits for expensive operations
const avatarRateLimiter = createRateLimiter({ max: 10, window: 60 })
const apiKeyRateLimiter = createRateLimiter({ max: 5, window: 60 })

function upstream(c: Parameters<typeof buildUpstreamUrl>[0]): string {
  return buildUpstreamUrl(c, serviceRegistry.user)
}

async function proxy(c: Parameters<typeof proxyRequest>[0]): Promise<Response> {
  return cb.fire(() => proxyRequest(c, upstream(c)))
}

// ── All user routes require a valid JWT ───────────────────────────────────────
user.use('/*', jwt)

user.get('/me', generalRateLimiter, async (c) => proxy(c))
user.patch('/me', generalRateLimiter, async (c) => proxy(c))
user.delete('/me', generalRateLimiter, async (c) => proxy(c))

// Multipart avatar upload — increased body limit handled by upstream service
user.put('/me/avatar', avatarRateLimiter, async (c) => proxy(c))

user.post('/me/api-keys', apiKeyRateLimiter, async (c) => proxy(c))
user.get('/me/api-keys', generalRateLimiter, async (c) => proxy(c))
user.delete('/me/api-keys/:keyId', generalRateLimiter, async (c) => proxy(c))

user.get('/me/integrations', generalRateLimiter, async (c) => proxy(c))
user.post('/me/onboarding/:step', generalRateLimiter, async (c) => proxy(c))
user.patch('/me/notification-preferences', generalRateLimiter, async (c) => proxy(c))
user.get('/me/sessions', generalRateLimiter, async (c) => proxy(c))

export { user as userRoutes }
