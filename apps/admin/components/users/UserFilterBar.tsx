'use client'

import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import * as Select from '@radix-ui/react-select'
import { ChevronDown } from 'lucide-react'
import type { UserFilterParams, UserPlan, UserStatus } from '@/types'
import { cn } from '@/lib/cn'

interface UserFilterBarProps {
  filters: Partial<UserFilterParams>
  onChange: (filters: Partial<UserFilterParams>) => void
  onReset: () => void
}

const PLANS: (UserPlan | 'all')[] = ['all', 'free', 'pro', 'team', 'enterprise']
const STATUSES: (UserStatus | 'all')[] = [
  'all',
  'active',
  'suspended',
  'unverified',
]

export function UserFilterBar({
  filters,
  onChange,
  onReset,
}: UserFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search ?? '')

  useEffect(() => {
    setLocalSearch(filters.search ?? '')
  }, [filters.search])

  useEffect(() => {
    const t = setTimeout(() => {
      onChange({ search: localSearch, page: 1 })
    }, 300)
    return () => clearTimeout(t)
  }, [localSearch, onChange])

  const isNonDefault =
    (filters.search && filters.search.length > 0) ||
    (filters.plan && filters.plan !== 'all') ||
    (filters.status && filters.status !== 'all') ||
    (filters.dateFrom && filters.dateFrom.length > 0) ||
    (filters.dateTo && filters.dateTo.length > 0)

  return (
    <div className="sticky top-0 z-10 border-b border-divider bg-card px-6 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[280px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search name or email…"
            className="h-9 w-full rounded-card border border-divider bg-white py-1 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <Select.Root
          value={filters.plan ?? 'all'}
          onValueChange={(v) =>
            onChange({ plan: v as UserPlan | 'all', page: 1 })
          }
        >
          <Select.Trigger className="inline-flex h-9 w-[140px] items-center justify-between rounded-card border border-divider bg-white px-3 text-sm text-heading">
            <Select.Value placeholder="Plan" />
            <Select.Icon>
              <ChevronDown className="h-3.5 w-3.5 text-muted" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              className="z-50 overflow-hidden rounded-card border border-divider bg-white shadow-md"
              position="popper"
            >
              <Select.Viewport className="p-1">
                {PLANS.map((p) => (
                  <Select.Item
                    key={p}
                    value={p}
                    className="cursor-pointer rounded-chip px-3 py-1.5 text-sm outline-none data-[highlighted]:bg-bg"
                  >
                    Plan: {p === 'all' ? 'All' : p}
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        <Select.Root
          value={filters.status ?? 'all'}
          onValueChange={(v) =>
            onChange({ status: v as UserStatus | 'all', page: 1 })
          }
        >
          <Select.Trigger className="inline-flex h-9 w-[160px] items-center justify-between rounded-card border border-divider bg-white px-3 text-sm">
            <Select.Value />
            <Select.Icon>
              <ChevronDown className="h-3.5 w-3.5 text-muted" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="z-50 overflow-hidden rounded-card border border-divider bg-white shadow-md">
              <Select.Viewport className="p-1">
                {STATUSES.map((s) => (
                  <Select.Item
                    key={s}
                    value={s}
                    className="cursor-pointer rounded-chip px-3 py-1.5 text-sm outline-none data-[highlighted]:bg-bg"
                  >
                    Status:{' '}
                    {s === 'all'
                      ? 'All'
                      : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">Joined:</span>
          <input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) =>
              onChange({ dateFrom: e.target.value, page: 1 })
            }
            className="h-9 w-[120px] rounded-card border border-divider bg-white px-2 text-xs"
          />
          <span className="text-muted">–</span>
          <input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) =>
              onChange({ dateTo: e.target.value, page: 1 })
            }
            className="h-9 w-[120px] rounded-card border border-divider bg-white px-2 text-xs"
          />
        </div>

        {isNonDefault && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-brand"
          >
            <X className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
