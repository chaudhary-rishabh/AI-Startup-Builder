export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'trialing'
  | 'paused'

export type BillingCycle = 'monthly' | 'yearly'
export type TransactionStatus = 'succeeded' | 'failed' | 'refunded' | 'pending'
export type DiscountType = 'percent' | 'amount'

export interface Plan {
  id: string
  name: string
  displayName: string
  priceMonthlyUsdCents: number
  priceYearlyUsdCents: number
  stripePriceMonthlyId: string | null
  stripePriceYearlyId: string | null
  tokenLimitMonthly: number
  projectLimit: number
  features: string[]
  isActive: boolean
}

export interface Subscription {
  id: string
  userId: string
  planId: string
  stripeCustomerId: string
  stripeSubscriptionId: string | null
  status: SubscriptionStatus
  billingCycle: BillingCycle
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelledAt: string | null
  cancelAtPeriodEnd: boolean
  trialEnd: string | null
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  userId: string
  subscriptionId: string | null
  stripeInvoiceId: string | null
  stripeChargeId: string | null
  amountCents: number
  currency: string
  status: TransactionStatus
  description: string | null
  refundedAmountCents: number
  refundedAt: string | null
  invoicePdfUrl: string | null
  createdAt: string
}

export interface TokenUsage {
  id: string
  userId: string
  month: string
  tokensUsed: number
  tokensLimit: number
  costUsd: string
  updatedAt: string
}

export interface Coupon {
  id: string
  code: string
  discountType: DiscountType
  discountValue: string
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
}
