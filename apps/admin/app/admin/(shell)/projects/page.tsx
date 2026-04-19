'use client'

import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listAllProjects } from '@/lib/api/projects.api'
import type { AdminProjectFilterParams } from '@/types'
import { AdminProjectsTable } from '@/components/projects/AdminProjectsTable'

const DEFAULT_FILTERS: AdminProjectFilterParams = {
  search: '',
  phase: 'all',
  status: 'all',
  buildMode: 'all',
  page: 1,
  limit: 25,
  sortBy: 'lastActiveAt',
  sortOrder: 'desc',
}

export default function AdminProjectsPage() {
  const [filters, setFilters] =
    useState<AdminProjectFilterParams>(DEFAULT_FILTERS)

  const merge = useCallback((f: Partial<AdminProjectFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...f }))
  }, [])

  const q = useQuery({
    queryKey: ['admin', 'projects', filters],
    queryFn: () => listAllProjects(filters),
  })

  const data = q.data

  return (
    <div className="space-y-4">
      <AdminProjectsTable
        projects={data?.projects ?? []}
        isLoading={q.isLoading}
        filters={filters}
        onFiltersChange={merge}
        total={data?.total ?? 0}
        totalPages={data?.totalPages ?? 1}
      />
    </div>
  )
}
