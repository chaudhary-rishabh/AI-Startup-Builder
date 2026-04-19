'use client'

import { useQuery } from '@tanstack/react-query'
import { useDateRange } from '@/hooks/useDateRange'
import {
  getAIUsageOverview,
  getAgentBreakdown,
  getModelBreakdown,
  getTokenLimits,
  getTokenTimeSeries,
  getTopUsers,
} from '@/lib/api/aiUsage.api'
import { AIUsageOverviewRow } from '@/components/ai-usage/AIUsageOverviewRow'
import { TokenTimeSeriesChart } from '@/components/ai-usage/TokenTimeSeriesChart'
import { ModelBreakdown } from '@/components/ai-usage/ModelBreakdown'
import { AgentBreakdownChart } from '@/components/ai-usage/AgentBreakdownChart'
import { TokenLimitsConfig } from '@/components/ai-usage/TokenLimitsConfig'
import { TopUsersTable } from '@/components/ai-usage/TopUsersTable'

export default function AdminAIUsagePage() {
  const { dateRange } = useDateRange()
  const { from, to } = dateRange

  const overviewQuery = useQuery({
    queryKey: ['admin', 'ai-overview', from, to],
    queryFn: () => getAIUsageOverview(from, to),
  })

  const tokensQuery = useQuery({
    queryKey: ['admin', 'ai-tokens', from, to],
    queryFn: () => getTokenTimeSeries(from, to),
  })

  const modelsQuery = useQuery({
    queryKey: ['admin', 'ai-models', from, to],
    queryFn: () => getModelBreakdown(from, to),
  })

  const agentsQuery = useQuery({
    queryKey: ['admin', 'ai-agents', from, to],
    queryFn: () => getAgentBreakdown(from, to),
  })

  const topUsersQuery = useQuery({
    queryKey: ['admin', 'ai-top-users', from, to],
    queryFn: () => getTopUsers(from, to, 20),
  })

  const limitsQuery = useQuery({
    queryKey: ['admin', 'ai-limits'],
    queryFn: getTokenLimits,
  })

  return (
    <div className="space-y-6">
      <AIUsageOverviewRow
        overview={overviewQuery.data}
        isLoading={overviewQuery.isLoading}
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TokenTimeSeriesChart
            data={tokensQuery.data ?? []}
            isLoading={tokensQuery.isLoading}
          />
        </div>
        <div>
          <ModelBreakdown
            data={modelsQuery.data ?? []}
            isLoading={modelsQuery.isLoading}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AgentBreakdownChart
          data={agentsQuery.data ?? []}
          isLoading={agentsQuery.isLoading}
        />
        <TokenLimitsConfig
          limits={limitsQuery.data}
          isLoading={limitsQuery.isLoading}
        />
      </div>
      <TopUsersTable
        users={topUsersQuery.data ?? []}
        isLoading={topUsersQuery.isLoading}
      />
    </div>
  )
}
