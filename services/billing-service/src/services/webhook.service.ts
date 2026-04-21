import { env } from '../config/env.js'
import { findCreditTopupByOrderId, updateCreditTopupCaptured } from '../db/queries/creditTopups.queries.js'
import { findPlanByName } from '../db/queries/plans.queries.js'
import { findSubscriptionByRazorpaySubscriptionId, findSubscriptionByUserId, updateSubscriptionStatus } from '../db/queries/subscriptions.queries.js'
import { createTransaction, findTransactionByRazorpayPaymentId } from '../db/queries/transactions.queries.js'
import { currentMonthDateString, getOrCreateMonthlyUsage, addBonusTokens } from '../db/queries/tokenUsage.queries.js'
import {
  publishInvoicePaid,
  publishSubscriptionActivated,
  publishSubscriptionCancelled,
  publishSubscriptionPaymentFailed,
  publishCreditTopupCompleted,
} from '../events/publisher.js'
import { getRedis } from '../lib/redis.js'
import { logger } from '../lib/logger.js'
import { updateTokenLimit } from './tokenUsage.service.js'
import { cancelReEngagementEmails } from './reEngagement.service.js'

function eventDedupeKey(body: Record<string, unknown>): string {
  const payload = body['payload'] as Record<string, unknown> | undefined
  const pay = payload?.['payment'] as { entity?: { id?: string } } | undefined
  const sub = payload?.['subscription'] as { entity?: { id?: string } } | undefined
  const id =
    pay?.entity?.id ??
    sub?.entity?.id ??
    (body['id'] as string | undefined) ??
    `${String(body['event'])}_${Date.now()}`
  return `webhook:razorpay:${id}`
}

export async function processRazorpayWebhookEvent(body: Record<string, unknown>): Promise<void> {
  const redis = getRedis()
  const idempotencyKey = eventDedupeKey(body)
  if (await redis.exists(idempotencyKey)) {
    logger.info('Razorpay webhook already processed', { key: idempotencyKey })
    return
  }

  const event = String(body['event'] ?? '')

  try {
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(body)
        break
      case 'subscription.activated':
      case 'subscription.charged':
        await handleSubscriptionLifecycle(body, event)
        break
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(body)
        break
      case 'subscription.halted':
        await handleSubscriptionHalted(body)
        break
      case 'payment.failed':
        await handlePaymentFailed(body)
        break
      default:
        logger.debug('Unhandled Razorpay webhook event', { event })
    }
  } catch (error) {
    logger.error('Razorpay webhook handler error', { event, error })
    return
  }

  await redis.setex(idempotencyKey, env.WEBHOOK_IDEMPOTENCY_TTL, '1')
}

async function handlePaymentCaptured(body: Record<string, unknown>): Promise<void> {
  const payload = body['payload'] as { payment?: { entity?: Record<string, unknown> } } | undefined
  const payment = payload?.payment?.entity
  if (!payment?.id) return
  const notes = (payment['notes'] as Record<string, string> | undefined) ?? {}
  const type = notes['type']
  if (type === 'topup') {
    await handleTopUpPayment(payment)
    return
  }
  if (type === 'subscription') {
    await handleSubscriptionPayment(payment)
  }
}

async function handleTopUpPayment(payment: Record<string, unknown>): Promise<void> {
  const orderId = String(payment['order_id'] ?? '')
  const payId = String(payment['id'] ?? '')
  const existing = await findTransactionByRazorpayPaymentId(payId)
  if (existing) return

  const row = await findCreditTopupByOrderId(orderId)
  if (!row) {
    logger.warn('Top-up order not found', { orderId })
    return
  }
  await updateCreditTopupCaptured(orderId, { razorpayPaymentId: payId, completedAt: new Date() })
  const month = currentMonthDateString()
  await getOrCreateMonthlyUsage(row.userId, month)
  await addBonusTokens(row.userId, month, BigInt(row.tokensGranted))

  await publishCreditTopupCompleted({
    userId: row.userId,
    tokensGranted: Number(row.tokensGranted),
    packName: row.packName,
    amountPaise: row.amountPaise,
  })
}

async function handleSubscriptionPayment(payment: Record<string, unknown>): Promise<void> {
  const payId = String(payment['id'] ?? '')
  const existing = await findTransactionByRazorpayPaymentId(payId)
  if (existing) return
  const userId = String((payment['notes'] as Record<string, string> | undefined)?.['userId'] ?? '')
  if (!userId) return
  const sub = await findSubscriptionByUserId(userId)
  const amount = Number(payment['amount'] ?? 0)
  await createTransaction({
    userId,
    subscriptionId: sub?.id ?? null,
    stripeInvoiceId: null,
    stripeChargeId: null,
    stripeEventId: null,
    razorpayOrderId: String(payment['order_id'] ?? ''),
    razorpayPaymentId: payId,
    razorpaySubscriptionId: (payment['subscription_id'] as string | undefined) ?? null,
    amountCents: amount,
    currency: String(payment['currency'] ?? 'inr'),
    status: 'succeeded',
    description: 'Subscription payment',
    invoicePdfUrl: null,
  })
  await updateSubscriptionStatus(userId, { status: 'active' })
  await publishInvoicePaid({
    userId,
    amountCents: amount,
    currency: String(payment['currency'] ?? 'inr'),
    invoiceId: payId,
    receiptUrl: null,
    planName: sub?.plan.name ?? 'pro',
  })
}

async function handleSubscriptionLifecycle(body: Record<string, unknown>, event: string): Promise<void> {
  const payload = body['payload'] as { subscription?: { entity?: Record<string, unknown> } } | undefined
  const entity = payload?.subscription?.entity
  if (!entity?.id) return
  const subId = String(entity['id'])
  const local = await findSubscriptionByRazorpaySubscriptionId(subId)
  const userId =
    local?.userId ??
    String((entity['notes'] as Record<string, string> | undefined)?.['userId'] ?? '')
  if (!userId) return
  const planName = String((entity['notes'] as Record<string, string> | undefined)?.['plan'] ?? 'pro')
  const plan = await findPlanByName(planName)
  if (!plan) return

  const start = entity['current_start'] as number | undefined
  const end = entity['current_end'] as number | undefined
  await updateSubscriptionStatus(userId, {
    status: 'active',
    razorpaySubscriptionId: subId,
    currentPeriodStart: start ? new Date(start * 1000) : null,
    currentPeriodEnd: end ? new Date(end * 1000) : null,
  })
  await updateTokenLimit(userId, BigInt(plan.tokenLimitMonthly))
  if (event === 'subscription.activated') {
    await publishSubscriptionActivated({
      userId,
      plan: planName,
      billingCycle: String((entity['notes'] as Record<string, string> | undefined)?.['billingCycle'] ?? 'monthly'),
      currentPeriodEnd: end ? new Date(end * 1000).toISOString() : new Date().toISOString(),
    })
  }
  await cancelReEngagementEmails(userId)
}

async function handleSubscriptionCancelled(body: Record<string, unknown>): Promise<void> {
  const payload = body['payload'] as { subscription?: { entity?: Record<string, unknown> } } | undefined
  const entity = payload?.subscription?.entity
  if (!entity?.id) return
  const subId = String(entity['id'])
  const local = await findSubscriptionByRazorpaySubscriptionId(subId)
  const userId = local?.userId ?? String((entity['notes'] as Record<string, string> | undefined)?.['userId'] ?? '')
  if (!userId) return
  const full = await findSubscriptionByUserId(userId)
  const freePlan = await findPlanByName('free')
  if (!freePlan) return
  await updateSubscriptionStatus(userId, {
    planId: freePlan.id,
    razorpaySubscriptionId: null,
    status: 'cancelled',
    billingCycle: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    isOneTimeCredits: true,
  })
  await updateTokenLimit(userId, BigInt(freePlan.tokenLimitMonthly))
  await publishSubscriptionCancelled({
    userId,
    plan: full?.plan.name ?? 'pro',
    cancelledAt: new Date().toISOString(),
    accessUntil: new Date().toISOString(),
  })
}

async function handleSubscriptionHalted(body: Record<string, unknown>): Promise<void> {
  const payload = body['payload'] as { subscription?: { entity?: Record<string, unknown> } } | undefined
  const entity = payload?.subscription?.entity
  const subId = entity?.id ? String(entity['id']) : ''
  const local = subId ? await findSubscriptionByRazorpaySubscriptionId(subId) : undefined
  const userId = local?.userId ?? ''
  if (!userId) return
  await updateSubscriptionStatus(userId, { status: 'past_due' })
  await publishSubscriptionPaymentFailed({
    userId,
    amountCents: 0,
    currency: 'inr',
    invoiceUrl: null,
    nextAttemptAt: null,
  })
}

async function handlePaymentFailed(body: Record<string, unknown>): Promise<void> {
  const payload = body['payload'] as { payment?: { entity?: Record<string, unknown> } } | undefined
  const payment = payload?.payment?.entity
  const notes = (payment?.['notes'] as Record<string, string> | undefined) ?? {}
  if (notes['type'] !== 'subscription') return
  const userId = notes['userId']
  if (!userId) return
  await updateSubscriptionStatus(userId, { status: 'past_due' })
  await publishSubscriptionPaymentFailed({
    userId,
    amountCents: 0,
    currency: 'inr',
    invoiceUrl: null,
    nextAttemptAt: null,
  })
}

/** @deprecated Stripe — kept for signature compatibility. */
export async function processWebhookEvent(_event: unknown): Promise<void> {
  logger.warn('processWebhookEvent called with legacy Stripe shape — use processRazorpayWebhookEvent')
}
