'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createIncident,
  getErrorLog,
  getLatencyTimeSeries,
  getServiceHealth,
} from '@/lib/api/system.api'
import { ServiceStatusCards } from '@/components/system/ServiceStatusCards'
import { LatencyChart } from '@/components/system/LatencyChart'
import { ErrorLogTable } from '@/components/system/ErrorLogTable'
import { IncidentModal } from '@/components/system/IncidentModal'

export default function AdminSystemPage() {
  const qc = useQueryClient()
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [errSeverity, setErrSeverity] = useState('all')
  const [errPage, setErrPage] = useState(1)

  const healthQuery = useQuery({
    queryKey: ['admin', 'service-health'],
    queryFn: getServiceHealth,
    refetchInterval: 30_000,
  })

  const latencyQuery = useQuery({
    queryKey: ['admin', 'latency'],
    queryFn: getLatencyTimeSeries,
    refetchInterval: 60_000,
  })

  const errQuery = useQuery({
    queryKey: ['admin', 'error-log', errSeverity, errPage],
    queryFn: () =>
      getErrorLog({
        severity: errSeverity === 'all' ? undefined : errSeverity,
        page: errPage,
        limit: 10,
      }),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <ServiceStatusCards
            services={healthQuery.data}
            isLoading={healthQuery.isLoading}
          />
        </div>
        <div className="w-full shrink-0 rounded-card border border-divider bg-card p-4 shadow-sm lg:w-56">
          <p className="text-sm font-medium text-heading">Create incident</p>
          <p className="mt-1 text-xs text-muted">
            Post to the public status page.
          </p>
          <button
            type="button"
            onClick={() => setIncidentOpen(true)}
            className="mt-3 w-full rounded-card bg-brand py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Create incident
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <LatencyChart
            data={latencyQuery.data ?? []}
            isLoading={latencyQuery.isLoading}
          />
        </div>
        <div className="xl:col-span-2">
          <h3 className="mb-3 font-display text-sm font-semibold text-heading">
            Error log
          </h3>
          <ErrorLogTable
            errors={errQuery.data?.errors ?? []}
            total={errQuery.data?.total ?? 0}
            isLoading={errQuery.isLoading}
            severity={errSeverity}
            onSeverityChange={(v) => {
              setErrSeverity(v)
              setErrPage(1)
            }}
            page={errPage}
            onPageChange={setErrPage}
          />
        </div>
      </div>

      <IncidentModal
        open={incidentOpen}
        onOpenChange={setIncidentOpen}
        onConfirm={async (payload) => {
          await createIncident(payload)
          toast.success('Incident created and posted to status page')
          void qc.invalidateQueries({ queryKey: ['admin', 'service-health'] })
        }}
      />
    </div>
  )
}
