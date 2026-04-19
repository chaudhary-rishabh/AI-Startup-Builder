'use client'

import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { getAuditLog } from '@/lib/api/audit.api'
import type { AuditLogFilter } from '@/types'
import { AuditLogTable } from '@/components/audit/AuditLogTable'

export default function AdminAuditPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const monthAgo = format(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    'yyyy-MM-dd',
  )

  const [auditFilters, setAuditFilters] = useState<Partial<AuditLogFilter>>({
    adminId: 'all',
    action: 'all',
    from: monthAgo,
    to: today,
    page: 1,
    limit: 25,
  })

  const merge = useCallback((f: Partial<AuditLogFilter>) => {
    setAuditFilters((prev) => ({ ...prev, ...f }))
  }, [])

  const q = useQuery({
    queryKey: ['admin', 'audit', auditFilters],
    queryFn: () => getAuditLog(auditFilters),
  })

  const data = q.data

  return (
    <div className="space-y-4">
      <AuditLogTable
        logs={data?.logs ?? []}
        total={data?.total ?? 0}
        totalPages={data?.totalPages ?? 1}
        page={auditFilters.page ?? 1}
        pageSize={auditFilters.limit ?? 25}
        isLoading={q.isLoading}
        filters={auditFilters}
        onFiltersChange={merge}
      />
    </div>
  )
}
