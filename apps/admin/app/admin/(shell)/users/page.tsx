'use client'

import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { bulkSuspendUsers, exportUsers, listUsers } from '@/lib/api/users.api'
import type { UserFilterParams } from '@/types'
import { UserFilterBar } from '@/components/users/UserFilterBar'
import { UserTable } from '@/components/users/UserTable'
import { UserDetailPanel } from '@/components/users/UserDetailPanel'
import { BulkActions } from '@/components/users/BulkActions'
import { ConfirmModal } from '@/components/common/ConfirmModal'

const DEFAULT_FILTERS: UserFilterParams = {
  search: '',
  plan: 'all',
  status: 'all',
  dateFrom: '',
  dateTo: '',
  page: 1,
  limit: 25,
  sortBy: 'joinedAt',
  sortOrder: 'desc',
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<UserFilterParams>(DEFAULT_FILTERS)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [detailUserId, setDetailUserId] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

  const mergeFilters = useCallback((f: Partial<UserFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...f }))
  }, [])

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: () => listUsers(filters),
  })

  const data = usersQuery.data

  return (
    <div className="relative -mx-6 -mt-6 flex min-h-[calc(100vh-8rem)] flex-col">
      <UserFilterBar
        filters={filters}
        onChange={mergeFilters}
        onReset={() => {
          setFilters(DEFAULT_FILTERS)
        }}
      />
      <div className="p-6">
        <UserTable
          users={data?.users ?? []}
          isLoading={usersQuery.isLoading}
          filters={filters}
          onFiltersChange={mergeFilters}
          total={data?.total ?? 0}
          totalPages={data?.totalPages ?? 1}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(u) => setDetailUserId(u.id)}
          selectedRowId={detailUserId ?? undefined}
        />
      </div>

      <AnimatePresence>
        {detailUserId ? (
          <UserDetailPanel
            key={detailUserId}
            userId={detailUserId}
            onClose={() => setDetailUserId(null)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIds.length > 0 ? (
          <BulkActions
            key="bulk"
            selectedIds={selectedIds}
            onClear={() => setSelectedIds([])}
            onBulkSuspend={() => setBulkOpen(true)}
            onBulkExport={() => void exportUsers(filters)}
          />
        ) : null}
      </AnimatePresence>

      <ConfirmModal
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Suspend selected users"
        description="These accounts will be suspended immediately."
        confirmLabel="Suspend all"
        variant="danger"
        isLoading={bulkLoading}
        onConfirm={async () => {
          setBulkLoading(true)
          try {
            await bulkSuspendUsers(selectedIds)
            setSelectedIds([])
            await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
          } finally {
            setBulkLoading(false)
          }
        }}
      />
    </div>
  )
}
