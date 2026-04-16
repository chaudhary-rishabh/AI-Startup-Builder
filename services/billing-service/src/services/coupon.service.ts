import { findCouponByCode } from '../db/queries/coupons.queries.js'

import type { Coupon } from '../db/schema.js'

export interface CouponValidationResult {
  valid: boolean
  coupon?: Coupon
  discountType?: 'percent' | 'amount'
  discountValue?: number
  expiresAt?: string | null
  error?:
    | 'COUPON_NOT_FOUND'
    | 'COUPON_EXPIRED'
    | 'COUPON_MAX_USES_REACHED'
    | 'COUPON_INVALID_FOR_PLAN'
}

export async function validateCoupon(
  code: string,
  planName?: string,
): Promise<CouponValidationResult> {
  const normalized = code.toUpperCase().trim()
  const coupon = await findCouponByCode(normalized)
  if (!coupon) return { valid: false, error: 'COUPON_NOT_FOUND' }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { valid: false, error: 'COUPON_EXPIRED' }
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: 'COUPON_MAX_USES_REACHED' }
  }

  if (
    coupon.validForPlans.length > 0 &&
    planName &&
    !coupon.validForPlans.includes(planName.toLowerCase())
  ) {
    return { valid: false, error: 'COUPON_INVALID_FOR_PLAN' }
  }

  return {
    valid: true,
    coupon,
    discountType: coupon.discountType as 'percent' | 'amount',
    discountValue: Number(coupon.discountValue),
    expiresAt: coupon.expiresAt?.toISOString() ?? null,
  }
}
