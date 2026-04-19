'use client'

import { useQuery } from '@tanstack/react-query'
import { useDateRange } from '@/hooks/useDateRange'
import {
  getAdminPlans,
  getRevenueSummary,
  listCoupons,
} from '@/lib/api/billing.api'
import { RevenueSummary } from '@/components/billing/RevenueSummary'
import { PlanManager } from '@/components/billing/PlanManager'
import { CouponManager } from '@/components/billing/CouponManager'
import { TransactionsTable } from '@/components/billing/TransactionsTable'

export default function BillingPage() {
  const { dateRange } = useDateRange()
  const { from, to } = dateRange

  const summaryQuery = useQuery({
    queryKey: ['admin', 'billing-summary', from, to],
    queryFn: () => getRevenueSummary(from, to),
  })

  const plansQuery = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: getAdminPlans,
  })

  const couponsQuery = useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: listCoupons,
  })

  return (
    <div className="space-y-6">
      <RevenueSummary
        summary={summaryQuery.data}
        isLoading={summaryQuery.isLoading}
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <PlanManager plans={plansQuery.data} isLoading={plansQuery.isLoading} />
          <CouponManager
            coupons={couponsQuery.data}
            isLoading={couponsQuery.isLoading}
          />
        </div>
        <div>
          <h3 className="mb-3 font-display text-sm font-semibold text-heading">
            Transactions
          </h3>
          <TransactionsTable />
        </div>
      </div>
    </div>
  )
}
