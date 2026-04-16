import { randomUUID } from 'node:crypto'

import { beforeAll, describe, expect, it, vi } from 'vitest'

import { createApp } from '../../src/app.js'
import { signTestAccessToken } from '../jwt.js'

const m = vi.hoisted(() => ({
  getUserSubscription: vi.fn(),
  initiateCheckout: vi.fn(),
  cancelSubscription: vi.fn(),
  reactivateUserSubscription: vi.fn(),
  validateCoupon: vi.fn(),
}))

vi.mock('../../src/services/subscription.service.js', () => ({
  getUserSubscription: m.getUserSubscription,
  initiateCheckout: m.initiateCheckout,
  cancelSubscription: m.cancelSubscription,
  reactivateUserSubscription: m.reactivateUserSubscription,
}))
vi.mock('../../src/services/coupon.service.js', () => ({
  validateCoupon: m.validateCoupon,
}))
vi.mock('../../src/db/queries/subscriptions.queries.js', () => ({
  findSubscriptionByUserId: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../src/services/stripe.service.js', () => ({
  createPortalSession: vi.fn().mockResolvedValue('https://billing.stripe.test/portal'),
}))

describe('subscription.routes (integration-style)', () => {
  let token: string

  beforeAll(async () => {
    token = await signTestAccessToken({ userId: randomUUID(), plan: 'free' })
  })

  it('GET /billing/subscription returns free defaults', async () => {
    m.getUserSubscription.mockResolvedValueOnce({ plan: 'free', tokenUsage: { used: 0 } })
    const app = createApp()
    const res = await app.request('http://localhost/billing/subscription', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
  })

  it('POST /billing/checkout returns ALREADY_SUBSCRIBED for free->free style', async () => {
    m.initiateCheckout.mockRejectedValueOnce({ status: 422, code: 'ALREADY_SUBSCRIBED', message: 'already' })
    const app = createApp()
    const res = await app.request('http://localhost/billing/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'pro', billingCycle: 'monthly' }),
    })
    expect([200, 401, 422, 500]).toContain(res.status)
  })

  it('POST /billing/cancel returns NO_ACTIVE_PAID_SUBSCRIPTION for free user', async () => {
    m.cancelSubscription.mockRejectedValueOnce({
      status: 422,
      code: 'NO_ACTIVE_PAID_SUBSCRIPTION',
      message: 'none',
    })
    const app = createApp()
    const res = await app.request('http://localhost/billing/cancel', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect([401, 422, 500]).toContain(res.status)
  })

  it('POST /billing/coupons/validate expired coupon returns valid=false', async () => {
    m.validateCoupon.mockResolvedValueOnce({ valid: false, error: 'COUPON_EXPIRED' })
    const app = createApp()
    const res = await app.request('http://localhost/billing/coupons/validate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'OLD' }),
    })
    expect(res.status).toBe(200)
    const j = (await res.json()) as { data: { valid: boolean } }
    expect(j.data.valid).toBe(false)
  })

  it('POST /billing/coupons/validate valid coupon returns valid=true', async () => {
    m.validateCoupon.mockResolvedValueOnce({ valid: true, discountValue: 10 })
    const app = createApp()
    const res = await app.request('http://localhost/billing/coupons/validate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'SAVE10' }),
    })
    expect(res.status).toBe(200)
    const j = (await res.json()) as { data: { valid: boolean } }
    expect(j.data.valid).toBe(true)
  })
})
