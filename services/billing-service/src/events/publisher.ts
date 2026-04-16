import { getRedis } from '../lib/redis.js'

const STREAM_KEY = 'platform:events'

async function publish(type: string, payload: Record<string, unknown>): Promise<void> {
  const redis = getRedis()
  await redis.xadd(
    STREAM_KEY,
    'MAXLEN',
    '~',
    '100000',
    '*',
    'type',
    type,
    'payload',
    JSON.stringify(payload),
    'timestamp',
    new Date().toISOString(),
    'source',
    'billing-service',
    'version',
    '1',
  )
}

export async function publishSubscriptionUpgraded(payload: {
  userId: string
  oldPlan: string
  newPlan: string
  tokenLimit: number
}): Promise<void> {
  await publish('subscription.upgraded', payload)
}

export async function publishSubscriptionCancelled(payload: {
  userId: string
  plan: string
  cancelledAt: string
  accessUntil: string
}): Promise<void> {
  await publish('subscription.cancelled', payload)
}

export async function publishInvoicePaid(payload: {
  userId: string
  amountCents: number
  currency: string
  invoiceId: string
  receiptUrl: string | null
  planName: string
}): Promise<void> {
  await publish('invoice.paid', payload)
}

export async function publishTokenBudgetWarning(payload: {
  userId: string
  percentUsed: 80 | 95
  tokensUsed: number
  tokenLimit: number
}): Promise<void> {
  await publish('token.budget.warning', payload)
}
