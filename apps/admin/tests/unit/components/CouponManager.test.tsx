import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CouponManager } from '@/components/billing/CouponManager'
import type { AdminCoupon } from '@/types'

const coupons: AdminCoupon[] = [
  {
    id: 'coup-1',
    code: 'LAUNCH50',
    discountType: 'percent',
    discountValue: 50,
    maxUses: 100,
    usedCount: 23,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    stripeCouponId: 'c',
    createdAt: new Date().toISOString(),
  },
]

const { createCouponMock, deleteCouponMock } = vi.hoisted(() => ({
  createCouponMock: vi.fn().mockResolvedValue({
    id: 'new',
    code: 'X',
    discountType: 'percent' as const,
    discountValue: 10,
    maxUses: null,
    usedCount: 0,
    expiresAt: null,
    stripeCouponId: null,
    createdAt: new Date().toISOString(),
  }),
  deleteCouponMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/api/billing.api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/billing.api')>(
    '@/lib/api/billing.api',
  )
  return {
    ...actual,
    createCoupon: createCouponMock,
    deleteCoupon: deleteCouponMock,
  }
})

describe('CouponManager', () => {
  it('renders active coupon list', () => {
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <CouponManager coupons={coupons} isLoading={false} />
      </QueryClientProvider>,
    )
    expect(screen.getByText('LAUNCH50')).toBeInTheDocument()
  })

  it('code shown in monospace chip', () => {
    const qc = new QueryClient()
    const { container } = render(
      <QueryClientProvider client={qc}>
        <CouponManager coupons={coupons} isLoading={false} />
      </QueryClientProvider>,
    )
    const chip = screen.getByText('LAUNCH50').closest('span')
    expect(chip?.className).toMatch(/font-mono/)
  })

  it('"50% off" label formatted correctly from percent', () => {
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <CouponManager coupons={coupons} isLoading={false} />
      </QueryClientProvider>,
    )
    expect(screen.getByText(/50% off/i)).toBeInTheDocument()
  })

  it('Delete button opens ConfirmModal', async () => {
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <CouponManager coupons={coupons} isLoading={false} />
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(await screen.findByText(/delete coupon/i)).toBeInTheDocument()
  })

  it('Create form: code auto-uppercased', async () => {
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <CouponManager coupons={coupons} isLoading={false} />
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByText('Create coupon'))
    const input = screen.getAllByRole('textbox')[0] as HTMLInputElement
    fireEvent.change(input, { target: { value: 'abc' } })
    expect(input.value).toBe('ABC')
  })

  it('Create coupon calls createCoupon API', async () => {
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <CouponManager coupons={coupons} isLoading={false} />
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByText('Create coupon'))
    fireEvent.change(screen.getAllByRole('textbox')[0]!, {
      target: { value: 'NEWCODE' },
    })
    const createBtns = screen.getAllByRole('button', {
      name: /^Create Coupon$/i,
    })
    fireEvent.click(createBtns[createBtns.length - 1]!)
    await waitFor(() => {
      expect(createCouponMock).toHaveBeenCalled()
    })
  })
})
