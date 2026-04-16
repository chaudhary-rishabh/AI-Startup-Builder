import { describe, expect, it, vi } from 'vitest'

import { validateCoupon } from '../../src/services/coupon.service.js'

const m = vi.hoisted(() => ({
  findCouponByCode: vi.fn(),
}))

vi.mock('../../src/db/queries/coupons.queries.js', () => ({
  findCouponByCode: m.findCouponByCode,
}))

describe('coupon.service', () => {
  it('valid coupon returns discount details', async () => {
    m.findCouponByCode.mockResolvedValueOnce({
      code: 'SAVE10',
      discountType: 'percent',
      discountValue: '10.00',
      maxUses: null,
      usedCount: 0,
      validForPlans: [],
      expiresAt: null,
    })
    const result = await validateCoupon('save10')
    expect(result.valid).toBe(true)
    expect(result.discountType).toBe('percent')
  })

  it('expired coupon returns COUPON_EXPIRED', async () => {
    m.findCouponByCode.mockResolvedValueOnce({
      code: 'OLD',
      discountType: 'percent',
      discountValue: '10.00',
      maxUses: null,
      usedCount: 0,
      validForPlans: [],
      expiresAt: new Date('2000-01-01'),
    })
    const result = await validateCoupon('old')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('COUPON_EXPIRED')
  })

  it('max uses reached returns COUPON_MAX_USES_REACHED', async () => {
    m.findCouponByCode.mockResolvedValueOnce({
      code: 'MAX',
      discountType: 'percent',
      discountValue: '10.00',
      maxUses: 10,
      usedCount: 10,
      validForPlans: [],
      expiresAt: null,
    })
    const result = await validateCoupon('max')
    expect(result.error).toBe('COUPON_MAX_USES_REACHED')
  })

  it('wrong plan returns COUPON_INVALID_FOR_PLAN', async () => {
    m.findCouponByCode.mockResolvedValueOnce({
      code: 'PROONLY',
      discountType: 'percent',
      discountValue: '10.00',
      maxUses: null,
      usedCount: 0,
      validForPlans: ['pro'],
      expiresAt: null,
    })
    const result = await validateCoupon('proonly', 'team')
    expect(result.error).toBe('COUPON_INVALID_FOR_PLAN')
  })

  it('unknown code returns COUPON_NOT_FOUND', async () => {
    m.findCouponByCode.mockResolvedValueOnce(undefined)
    const result = await validateCoupon('missing')
    expect(result.error).toBe('COUPON_NOT_FOUND')
  })
})
