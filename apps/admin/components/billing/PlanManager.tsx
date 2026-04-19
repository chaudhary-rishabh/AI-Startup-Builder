'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import type { AdminPlan } from '@/types'
import { formatCents } from '@/lib/dateRange'
import { updatePlan } from '@/lib/api/billing.api'
import { PlanEditModal } from '@/components/billing/PlanEditModal'

interface PlanManagerProps {
  plans: AdminPlan[] | undefined
  isLoading: boolean
}

export function PlanManager({ plans, isLoading }: PlanManagerProps) {
  const qc = useQueryClient()
  const [edit, setEdit] = useState<AdminPlan | null>(null)

  if (isLoading || !plans) {
    return <div className="h-48 rounded-card border border-divider shimmer" />
  }

  return (
    <>
      <div className="rounded-card border border-divider bg-card shadow-sm">
        <div className="border-b border-divider px-5 py-3">
          <h3 className="font-display text-sm font-semibold text-heading">
            Plans
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-output text-left text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2">Monthly</th>
                <th className="px-4 py-2">Yearly</th>
                <th className="px-4 py-2">Users</th>
                <th className="px-4 py-2">Revenue</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-divider hover:bg-output/40"
                >
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{formatCents(p.priceMonthly)}</td>
                  <td className="px-4 py-3">{formatCents(p.priceYearly)}</td>
                  <td className="px-4 py-3">{p.userCount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {formatCents(p.monthlyRevenueCents)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEdit(p)}
                      className="inline-flex items-center gap-1 rounded-chip border border-divider px-2 py-1 text-xs hover:bg-bg"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PlanEditModal
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(null)}
        plan={edit}
        onSave={async (payload) => {
          if (!edit) return
          await updatePlan(edit.id, payload)
          toast.success('Plan updated — syncing to Stripe')
          await qc.invalidateQueries({ queryKey: ['admin', 'plans'] })
        }}
      />
    </>
  )
}
