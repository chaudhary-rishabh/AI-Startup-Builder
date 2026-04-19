'use client'

import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import type { AdminCoupon } from '@/types'
import { createCoupon, deleteCoupon } from '@/lib/api/billing.api'
import { ConfirmModal } from '@/components/common/ConfirmModal'

interface CouponManagerProps {
  coupons: AdminCoupon[] | undefined
  isLoading: boolean
}

export function CouponManager({ coupons, isLoading }: CouponManagerProps) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>(
    'percent',
  )
  const [value, setValue] = useState<number>(10)
  const [maxUses, setMaxUses] = useState<string>('')
  const [expiresAt, setExpiresAt] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const submit = async () => {
    setCreating(true)
    try {
      await createCoupon({
        code: code.toUpperCase(),
        discountType,
        discountValue: value,
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt || null,
      })
      toast.success('Coupon created')
      setCode('')
      await qc.invalidateQueries({ queryKey: ['admin', 'coupons'] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setCreating(false)
    }
  }

  if (isLoading || !coupons) {
    return <div className="h-40 rounded-card shimmer" />
  }

  return (
    <>
      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <div className="rounded-card border border-divider bg-card shadow-sm">
          <Collapsible.Trigger className="flex w-full items-center justify-between px-5 py-3 text-left font-display text-sm font-semibold text-heading">
            Create coupon
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </Collapsible.Trigger>
          <Collapsible.Content>
            <div className="space-y-3 border-t border-divider px-5 py-4 text-sm">
              <label className="block">
                Code
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-card border border-divider px-3 py-2 font-mono uppercase"
                />
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={discountType === 'percent'}
                    onChange={() => setDiscountType('percent')}
                  />
                  Percent off
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={discountType === 'amount'}
                    onChange={() => setDiscountType('amount')}
                  />
                  Amount off
                </label>
              </div>
              <label className="block">
                Value {discountType === 'percent' ? '(%)' : '($)'}
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="mt-1 w-full rounded-card border border-divider px-3 py-2"
                />
              </label>
              <label className="block">
                Max uses (empty = unlimited)
                <input
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="mt-1 w-full rounded-card border border-divider px-3 py-2"
                />
              </label>
              <label className="block">
                Expires at
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="mt-1 w-full rounded-card border border-divider px-3 py-2"
                />
              </label>
              <button
                type="button"
                disabled={creating || !code.trim()}
                onClick={() => void submit()}
                className="rounded-card bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Create Coupon
              </button>
            </div>
          </Collapsible.Content>
        </div>
      </Collapsible.Root>

      <div className="mt-6 rounded-card border border-divider bg-card shadow-sm">
        <div className="border-b border-divider px-5 py-3">
          <h3 className="font-display text-sm font-semibold text-heading">
            Active coupons
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-output text-left text-[11px] uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Discount</th>
                <th className="px-4 py-2">Uses</th>
                <th className="px-4 py-2">Expires</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-t border-divider">
                  <td className="px-4 py-3">
                    <span className="rounded-chip bg-output px-2 py-0.5 font-mono text-xs">
                      {c.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.discountType === 'percent'
                      ? `${c.discountValue}% off`
                      : `$${(c.discountValue / 100).toFixed(2)} off`}
                  </td>
                  <td className="px-4 py-3">
                    {c.usedCount} /{' '}
                    {c.maxUses == null ? 'unlimited' : c.maxUses}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {c.expiresAt
                      ? new Date(c.expiresAt).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setDeleteId(c.id)}
                      className="text-xs text-error hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Delete coupon"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => {
          if (!deleteId) return
          await deleteCoupon(deleteId)
          toast.success('Coupon deleted')
          await qc.invalidateQueries({ queryKey: ['admin', 'coupons'] })
        }}
      />
    </>
  )
}
