// import api from '@/lib/axios'
import type { TokenBudget } from '@/types'

export type { TokenBudget }

// ── BILLING SERVICE TEMPORARILY DISABLED (local stubs; no gateway /billing proxy) ──
// Remove the early returns below and uncomment the original `api.*` bodies when re-enabling billing.

export interface Subscription {
  planTier: 'free' | 'starter' | 'pro' | 'team' | 'enterprise'
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  razorpayCustomerId: string | null
}

export interface Invoice {
  id: string
  amountPaid: number
  currency: string
  status: string
  pdfUrl: string | null
  hostedInvoiceUrl: string | null
  createdAt: string
}

export interface Plan {
  tier: string
  name: string
  priceMonthlyPaise: number
  priceYearlyPaise: number
  tokenLimit: number
  projectLimit: number
  features: string[]
}

export interface RazorpayCheckoutData {
  subscriptionId: string
  razorpayKeyId: string
  name: string
  description: string
  prefill: { email: string; name: string }
}

function stubTokenBudget(): TokenBudget {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return {
    tokensUsed: 0,
    tokensLimit: 999_999,
    tokensRemaining: 999_999,
    bonusTokens: 0,
    effectiveLimit: 999_999,
    effectiveRemaining: 999_999,
    percentUsed: 0,
    planTier: 'free',
    currentMonth: month,
    resetAt: null,
    isUnlimited: true,
    warningThresholds: [
      { percent: 80, triggered: false },
      { percent: 95, triggered: false },
    ],
    creditState: 'active',
    isOneTimeCredits: false,
  }
}

export async function getTokenBudget(): Promise<TokenBudget> {
  return stubTokenBudget()
  // const res = await api.get<{ data: TokenBudget }>('/billing/token-budget')
  // return res.data.data
}

export async function getSubscription(): Promise<Subscription> {
  return {
    planTier: 'free',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 864e9).toISOString(),
    cancelAtPeriodEnd: false,
    razorpayCustomerId: null,
  }
  // const res = await api.get<{ data: SubscriptionRaw }>('/billing/subscription')
  // const raw = res.data.data
  // return {
  //   planTier: raw.plan as Subscription['planTier'],
  //   status: raw.status as Subscription['status'],
  //   currentPeriodEnd: raw.currentPeriodEnd ?? new Date().toISOString(),
  //   cancelAtPeriodEnd: raw.cancelAtPeriodEnd,
  //   razorpayCustomerId: raw.razorpayCustomerId,
  // }
}

export async function getInvoices(): Promise<Invoice[]> {
  return []
  // const res = await api.get<{ data: { invoices: Invoice[] } }>('/billing/invoices')
  // return res.data.data.invoices
}

export async function getPlans(): Promise<Plan[]> {
  return [
    {
      tier: 'free',
      name: 'Free',
      priceMonthlyPaise: 0,
      priceYearlyPaise: 0,
      tokenLimit: 50_000,
      projectLimit: 3,
      features: ['Full access while billing is offline'],
    },
  ]
  // const res = await api.get<{ data: { plans: PlanRow[] } }>('/billing/plans')
  // const rows = res.data.data.plans
  // return rows.map((p) => ({
  //   tier: p.name,
  //   name: p.displayName,
  //   priceMonthlyPaise: p.priceMonthlyPaise,
  //   priceYearlyPaise: p.priceYearlyPaise,
  //   tokenLimit: p.tokenLimitMonthly,
  //   projectLimit: p.projectLimit,
  //   features: p.features,
  // }))
}

export async function createCheckoutSession(payload: {
  plan: 'starter' | 'pro' | 'team'
  billingCycle: 'monthly' | 'yearly'
  couponCode?: string
}): Promise<{ checkoutData: RazorpayCheckoutData }> {
  void payload
  throw new Error('Billing is temporarily disabled.')
  // const res = await api.post<{ data: { checkoutData: RazorpayCheckoutData } }>('/billing/checkout', payload)
  // return res.data.data
}

export async function createTopUpOrder(packName: string): Promise<{
  orderId: string
  amountPaise: number
  tokenGrant: number
  razorpayKeyId: string
}> {
  void packName
  throw new Error('Billing is temporarily disabled.')
  // const res = await api.post<{
  //   data: { orderId: string; amountPaise: number; tokenGrant: number; razorpayKeyId: string }
  // }>('/billing/topup/order', { packName })
  // return res.data.data
}

export async function verifyTopUp(payload: {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}): Promise<{ success: boolean; tokensGranted: number; newBonusTotal: number }> {
  void payload
  throw new Error('Billing is temporarily disabled.')
  // const res = await api.post<{ data: { success: boolean; tokensGranted: number; newBonusTotal: number } }>(
  //   '/billing/topup/verify',
  //   payload,
  // )
  // return res.data.data
}

export async function cancelSubscription(): Promise<void> {
  return
  // await api.post('/billing/cancel')
}
