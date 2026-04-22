// import api from '@/lib/axios'
import type { AdminCoupon, AdminPlan, AdminRevenueSummary, AdminTransaction } from '@/types'
// import { unwrap } from '@/lib/api/envelope'

// ── BILLING SERVICE TEMPORARILY DISABLED — restore api + unwrap calls when billing-service is back ──

const emptyRevenue = (): AdminRevenueSummary => ({
  mrrCents: 0,
  arrCents: 0,
  churnRate: 0,
  ltv: 0,
  changes: { mrr: 0, arr: 0, churnRate: 0, ltv: 0 },
})

export async function getRevenueSummary(from: string, to: string): Promise<AdminRevenueSummary> {
  void from
  void to
  return emptyRevenue()
  // const body: unknown = await api.get('/admin/billing/summary', { params: { from, to } })
  // return unwrap<AdminRevenueSummary>(body)
}

export async function getAdminPlans(): Promise<AdminPlan[]> {
  return []
  // const body: unknown = await api.get('/admin/billing/plans')
  // return unwrap<AdminPlan[]>(body)
}

export async function updatePlan(
  planId: string,
  payload: {
    name?: string
    priceMonthly?: number
    priceYearly?: number
    tokenLimit?: number
    projectLimit?: number
    features?: string[]
  },
): Promise<AdminPlan> {
  return {
    id: planId,
    tier: 'stub',
    name: payload.name ?? 'Plan',
    priceMonthly: payload.priceMonthly ?? 0,
    priceYearly: payload.priceYearly ?? 0,
    tokenLimit: payload.tokenLimit ?? 0,
    projectLimit: payload.projectLimit ?? 0,
    features: payload.features ?? [],
    userCount: 0,
    monthlyRevenueCents: 0,
    stripePriceId: null,
  }
  // const body: unknown = await api.patch(`/admin/billing/plans/${planId}`, payload)
  // return unwrap<AdminPlan>(body)
}

export interface PaginatedTransactions {
  transactions: AdminTransaction[]
  total: number
  page: number
  totalPages: number
}

export async function listTransactions(params: {
  status?: string
  userId?: string
  page?: number
  limit?: number
}): Promise<PaginatedTransactions> {
  void params
  return { transactions: [], total: 0, page: 1, totalPages: 0 }
  // const body: unknown = await api.get('/admin/billing/transactions', { params })
  // return unwrap<PaginatedTransactions>(body)
}

export async function issueRefund(
  transactionId: string,
  amountCents: number,
  reason: string,
): Promise<void> {
  void transactionId
  void amountCents
  void reason
  return
  // const body: unknown = await api.post(
  //   `/admin/billing/transactions/${transactionId}/refund`,
  //   { amountCents, reason },
  // )
  // unwrap<Record<string, never>>(body)
}

export async function exportTransactions(): Promise<void> {
  return
  // const res = (await api.get('/admin/billing/transactions/export', {
  //   responseType: 'blob',
  // })) as Blob | string
  // ...
}

export async function listCoupons(): Promise<AdminCoupon[]> {
  return []
  // const body: unknown = await api.get('/admin/billing/coupons')
  // return unwrap<AdminCoupon[]>(body)
}

export async function createCoupon(payload: {
  code: string
  discountType: 'percent' | 'amount'
  discountValue: number
  maxUses: number | null
  expiresAt: string | null
}): Promise<AdminCoupon> {
  return {
    id: 'stub',
    code: payload.code,
    discountType: payload.discountType,
    discountValue: payload.discountValue,
    maxUses: payload.maxUses,
    usedCount: 0,
    expiresAt: payload.expiresAt,
    stripeCouponId: null,
    createdAt: new Date().toISOString(),
  }
  // const body: unknown = await api.post('/admin/billing/coupons', payload)
  // return unwrap<AdminCoupon>(body)
}

export async function deleteCoupon(couponId: string): Promise<void> {
  void couponId
  return
  // await api.delete(`/admin/billing/coupons/${couponId}`)
}

export async function grantBonusCredits(payload: {
  userId: string
  tokensToGrant: number
  reason: string
}): Promise<{ newBonusTotal: number }> {
  return { newBonusTotal: payload.tokensToGrant }
  // const body: unknown = await api.post('/billing/admin/grant-credits', payload)
  // return unwrap<{ newBonusTotal: number }>(body)
}
