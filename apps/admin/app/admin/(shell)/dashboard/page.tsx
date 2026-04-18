'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useDateRange } from '@/hooks/useDateRange'
import { KPIRow } from '@/components/dashboard/KPIRow'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { UserGrowthChart } from '@/components/dashboard/UserGrowthChart'
import { RecentSignupsTable } from '@/components/dashboard/RecentSignupsTable'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import {
  getPlatformKPIs,
  getRevenueTimeSeries,
  getUserGrowthTimeSeries,
  getRecentSignups,
  getActivityFeed,
} from '@/lib/api/dashboard.api'

export default function DashboardPage() {
  const { dateRange } = useDateRange()
  const { from, to } = dateRange

  const kpisQuery = useQuery({
    queryKey: ['admin', 'kpis', from, to],
    queryFn: () => getPlatformKPIs(from, to),
  })

  const revenueQuery = useQuery({
    queryKey: ['admin', 'revenue', from, to],
    queryFn: () => getRevenueTimeSeries(from, to),
  })

  const growthQuery = useQuery({
    queryKey: ['admin', 'growth', from, to],
    queryFn: () => getUserGrowthTimeSeries(from, to),
  })

  const signupsQuery = useQuery({
    queryKey: ['admin', 'signups'],
    queryFn: () => getRecentSignups(10),
    staleTime: 60_000,
  })

  const activityQuery = useQuery({
    queryKey: ['admin', 'activity'],
    queryFn: () => getActivityFeed(20),
    staleTime: 30_000,
  })

  return (
    <div className="space-y-6 max-w-[1600px]">
      <KPIRow kpis={kpisQuery.data} isLoading={kpisQuery.isLoading} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <RevenueChart
            data={revenueQuery.data ?? []}
            isLoading={revenueQuery.isLoading}
          />
        </div>
        <div>
          <UserGrowthChart
            data={growthQuery.data ?? []}
            isLoading={growthQuery.isLoading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-card shadow-sm">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-divider">
            <h3 className="font-display text-sm font-semibold text-heading">
              Recent Signups
            </h3>
            <Link
              href="/admin/users"
              className="text-xs text-brand hover:underline"
            >
              View all →
            </Link>
          </div>
          <RecentSignupsTable
            signups={signupsQuery.data ?? []}
            isLoading={signupsQuery.isLoading}
          />
        </div>

        <div className="bg-card rounded-card shadow-sm">
          <div className="px-5 pt-5 pb-3 border-b border-divider">
            <h3 className="font-display text-sm font-semibold text-heading">
              Activity Feed
            </h3>
          </div>
          <ActivityFeed
            events={activityQuery.data ?? []}
            isLoading={activityQuery.isLoading}
          />
        </div>
      </div>
    </div>
  )
}
