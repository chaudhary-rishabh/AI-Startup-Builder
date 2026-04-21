import { Hono } from 'hono'

import { serviceRegistry } from '../config/serviceRegistry.js'
import { createJwtVerify } from '../middleware/jwtVerify.js'
import { createCircuitBreaker } from '../middleware/circuitBreaker.js'
import { generalRateLimiter, adminRateLimiter } from '../middleware/rateLimiter.js'
import { buildUpstreamUrl, proxyRequest } from '../lib/proxy.js'

const billing = new Hono()
const jwt = createJwtVerify()
const cb = createCircuitBreaker('billing')

function upstream(c: Parameters<typeof buildUpstreamUrl>[0]): string {
  return buildUpstreamUrl(c, serviceRegistry.billing)
}

async function proxy(c: Parameters<typeof proxyRequest>[0]): Promise<Response> {
  return cb.fire(() => proxyRequest(c, upstream(c)))
}

// ── Webhooks — NO JWT, raw body passthrough for signature verification ────────
billing.post('/webhooks/stripe', async (c) => {
  return cb.fire(() => proxyRequest(c, upstream(c), { skipBodyParsing: false }))
})
billing.post('/webhooks/razorpay', async (c) => {
  return cb.fire(() => proxyRequest(c, upstream(c), { skipBodyParsing: false }))
})

// ── All other billing routes require JWT ─────────────────────────────────────
billing.use('/*', jwt)

billing.get('/plans', generalRateLimiter, async (c) => proxy(c))
billing.get('/subscription', generalRateLimiter, async (c) => proxy(c))
billing.post('/checkout', generalRateLimiter, async (c) => proxy(c))
billing.post('/portal', generalRateLimiter, async (c) => proxy(c))
billing.delete('/subscription', generalRateLimiter, async (c) => proxy(c))
billing.patch('/subscription/resume', generalRateLimiter, async (c) => proxy(c))
billing.get('/invoices', generalRateLimiter, async (c) => proxy(c))
billing.get('/invoices/:invoiceId/download', generalRateLimiter, async (c) => proxy(c))
billing.post('/coupons/validate', generalRateLimiter, async (c) => proxy(c))
billing.get('/usage', generalRateLimiter, async (c) => proxy(c))
billing.get('/token-usage', generalRateLimiter, async (c) => proxy(c))
billing.get('/token-budget', generalRateLimiter, async (c) => proxy(c))
billing.post('/cancel', generalRateLimiter, async (c) => proxy(c))
billing.post('/reactivate', generalRateLimiter, async (c) => proxy(c))
billing.post('/topup/order', generalRateLimiter, async (c) => proxy(c))
billing.post('/topup/verify', generalRateLimiter, async (c) => proxy(c))
billing.post('/admin/grant-credits', adminRateLimiter, async (c) => proxy(c))
billing.post('/admin/refund', adminRateLimiter, async (c) => proxy(c))

export { billing as billingRoutes }
