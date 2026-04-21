import { Hono } from 'hono'

import type { ErrorResponse } from '@repo/types'

import { env } from '../config/env.js'
import { serviceRegistry } from '../config/serviceRegistry.js'
import { authRateLimiter, refreshRateLimiter, generalRateLimiter } from '../middleware/rateLimiter.js'
import { logger } from '../observability/logger.js'
import { buildUpstreamUrl, proxyRequest } from '../lib/proxy.js'

const auth = new Hono()

function upstream(c: Parameters<typeof buildUpstreamUrl>[0]): string {
  return buildUpstreamUrl(c, serviceRegistry.auth)
}

/**
 * Auth routes do not use the circuit breaker: a tripped breaker returns a generic 503 and
 * hides the real failure (e.g. auth-service not running, wrong AUTH_SERVICE_URL, IPv6 localhost).
 */
async function proxy(c: Parameters<typeof proxyRequest>[0]): Promise<Response> {
  const url = upstream(c)
  try {
    return await proxyRequest(c, url)
  } catch (e: unknown) {
    const requestId = (c.get('requestId' as never) as string | undefined) ?? ''
    const msg = e instanceof Error ? e.message : String(e)
    logger.error({
      event: 'auth_proxy_failed',
      requestId,
      url,
      error: msg,
    })
    const devHint =
      env.NODE_ENV === 'development'
        ? ` Check AUTH_SERVICE_URL (${serviceRegistry.auth}) and that auth-service is listening on that host/port. (${msg})`
        : ''
    const body: ErrorResponse = {
      success: false,
      error: {
        code: 'BAD_GATEWAY',
        message: `Could not reach the authentication service.${devHint}`,
        traceId: requestId,
        service: 'api-gateway',
      },
    }
    return c.json(body, 502)
  }
}

// ── Auth routes — NO JWT middleware (auth service handles token verification) ──

auth.get('/me', generalRateLimiter, async (c) => proxy(c))
auth.post('/register', authRateLimiter, async (c) => proxy(c))
auth.post('/login', authRateLimiter, async (c) => proxy(c))
auth.post('/refresh', refreshRateLimiter, async (c) => proxy(c))
auth.post('/logout', generalRateLimiter, async (c) => proxy(c))
auth.post('/verify-email', generalRateLimiter, async (c) => proxy(c))
auth.post('/forgot-password', authRateLimiter, async (c) => proxy(c))
auth.post('/reset-password', authRateLimiter, async (c) => proxy(c))
auth.get('/oauth/google', authRateLimiter, async (c) => proxy(c))
auth.get('/oauth/google/callback', authRateLimiter, async (c) => proxy(c))
auth.post('/oauth/google', authRateLimiter, async (c) => proxy(c))
auth.post('/2fa/setup', generalRateLimiter, async (c) => proxy(c))
auth.post('/2fa/verify', authRateLimiter, async (c) => proxy(c))
auth.delete('/2fa/disable', generalRateLimiter, async (c) => proxy(c))
auth.get('/sessions', generalRateLimiter, async (c) => proxy(c))

export { auth as authRoutes }
