import { Hono } from 'hono'

import { env } from '../config/env.js'
import { err } from '../lib/response.js'
import { logger } from '../lib/logger.js'
import { verifyWebhookSignature } from '../services/razorpay.service.js'
import { processRazorpayWebhookEvent } from '../services/webhook.service.js'

const routes = new Hono()

// Kong: ensure raw body is passed through for signature verification.
routes.post('/webhooks/razorpay', async (c) => {
  const rawBody = await c.req.text()
  const signature = c.req.header('x-razorpay-signature')
  if (!signature) {
    return err(c, 400, 'MISSING_SIGNATURE', 'x-razorpay-signature header required')
  }

  const valid = verifyWebhookSignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET)
  if (!valid) {
    return err(c, 400, 'INVALID_SIGNATURE', 'Webhook signature verification failed')
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return err(c, 400, 'INVALID_JSON', 'Invalid JSON body')
  }

  setImmediate(() => {
    void processRazorpayWebhookEvent(parsed).catch((error) =>
      logger.error('Async Razorpay webhook processing failed', { error }),
    )
  })

  return c.json({ received: true }, 200)
})

/** Legacy Stripe path — returns 410 so clients migrate to /webhooks/razorpay */
routes.post('/webhooks/stripe', (c) =>
  err(c, 410, 'STRIPE_DEPRECATED', 'Stripe webhooks are disabled. Use POST /billing/webhooks/razorpay'),
)

export default routes
