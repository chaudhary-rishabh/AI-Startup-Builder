import { Hono } from 'hono'

import { err } from '../lib/response.js'
import { verifyWebhookSignature } from '../services/stripe.service.js'

const routes = new Hono()

routes.post('/webhooks/stripe', async (c) => {
  const signature = c.req.header('stripe-signature')
  if (!signature) {
    return err(c, 400, 'MISSING_STRIPE_SIGNATURE', 'Missing Stripe signature header')
  }
  const rawBody = Buffer.from(await c.req.raw.arrayBuffer())
  verifyWebhookSignature(rawBody, signature)
  return c.json({ received: true }, 200)
})

export default routes
