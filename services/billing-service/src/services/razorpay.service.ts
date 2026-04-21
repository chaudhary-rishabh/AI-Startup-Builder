import crypto from 'node:crypto'

import Razorpay from 'razorpay'

import { env } from '../config/env.js'
import { insertCreditTopupPending } from '../db/queries/creditTopups.queries.js'
import { AppError } from '../lib/errors.js'

const rzp = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
})

export async function createOrder(payload: {
  amountPaise: number
  currency: 'INR'
  receipt: string
  notes: Record<string, string>
}): Promise<{ orderId: string; amount: number; currency: string }> {
  const order = await rzp.orders.create({
    amount: payload.amountPaise,
    currency: payload.currency,
    receipt: payload.receipt.slice(0, 40),
    notes: payload.notes,
  })
  return {
    orderId: order.id,
    amount: order.amount as number,
    currency: order.currency,
  }
}

export async function createSubscription(payload: {
  planId: string
  totalCount: number
  quantity: number
  customerId: string
  notes: Record<string, string>
}): Promise<{ subscriptionId: string }> {
  const sub = await (
    rzp.subscriptions as unknown as {
      create: (p: Record<string, unknown>) => Promise<{ id: string }>
    }
  ).create({
    plan_id: payload.planId,
    total_count: payload.totalCount,
    quantity: payload.quantity,
    customer_notify: 1,
    customer_id: payload.customerId,
    notes: payload.notes,
  })
  return { subscriptionId: sub.id }
}

export async function createCustomer(payload: {
  name: string
  email: string
  contact?: string
}): Promise<{ customerId: string }> {
  const c = await rzp.customers.create({
    name: payload.name,
    email: payload.email,
    ...(payload.contact ? { contact: payload.contact } : {}),
  })
  return { customerId: c.id }
}

export async function cancelSubscription(
  subscriptionId: string,
  cancelAtCycleEnd = true,
): Promise<void> {
  await rzp.subscriptions.cancel(subscriptionId, cancelAtCycleEnd)
}

export async function reactivateSubscriptionRazorpay(subscriptionId: string): Promise<void> {
  await (
    rzp.subscriptions as unknown as {
      update: (id: string, p: Record<string, unknown>) => Promise<unknown>
    }
  ).update(subscriptionId, { cancel_at_cycle_end: 0 })
}

export async function createRefund(
  paymentId: string,
  amountPaise: number,
  _notes: Record<string, string>,
): Promise<{ refundId: string }> {
  const refund = await rzp.payments.refund(paymentId, { amount: amountPaise })
  return { refundId: (refund as { id: string }).id }
}

export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return expected === signature
}

const PACKS: Record<
  'starter_pack' | 'builder_pack' | 'studio_pack',
  { amountPaise: number; tokens: number }
> = {
  starter_pack: { amountPaise: 19900, tokens: 100_000 },
  builder_pack: { amountPaise: 79900, tokens: 500_000 },
  studio_pack: { amountPaise: 249900, tokens: 2_000_000 },
}

export async function createTopUpOrder(payload: {
  userId: string
  packName: 'starter_pack' | 'builder_pack' | 'studio_pack'
}): Promise<{ orderId: string; amountPaise: number; tokenGrant: number }> {
  const pack = PACKS[payload.packName]
  if (!pack) throw new AppError('INVALID_PACK', 'Unknown top-up pack', 422)

  const receipt = `topup_${payload.userId}_${Date.now()}`.slice(0, 40)
  const order = await createOrder({
    amountPaise: pack.amountPaise,
    currency: 'INR',
    receipt,
    notes: {
      type: 'topup',
      userId: payload.userId,
      packName: payload.packName,
      tokens: String(pack.tokens),
    },
  })

  await insertCreditTopupPending({
    userId: payload.userId,
    razorpayOrderId: order.orderId,
    razorpayPaymentId: null,
    tokensGranted: pack.tokens,
    amountPaise: pack.amountPaise,
    status: 'pending',
    packName: payload.packName,
    completedAt: null,
  })

  return {
    orderId: order.orderId,
    amountPaise: pack.amountPaise,
    tokenGrant: pack.tokens,
  }
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const body = `${orderId}|${paymentId}`
  const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(body).digest('hex')
  return expected === signature
}

export { rzp }
