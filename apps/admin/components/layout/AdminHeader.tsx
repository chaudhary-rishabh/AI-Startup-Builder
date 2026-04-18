'use client'

import { usePathname } from 'next/navigation'
import { Download } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useDateRange } from '@/hooks/useDateRange'
import type { DateRangePreset } from '@/types'

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/billing': 'Billing & Revenue',
  '/admin/ai-usage': 'AI Usage',
  '/admin/projects': 'Projects',
  '/admin/system': 'System Health',
  '/admin/settings': 'Settings',
  '/admin/audit': 'Audit Log',
}

const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
]

export function AdminHeader() {
  const pathname = usePathname()
  const { preset, setPreset } = useDateRange()

  const title =
    Object.entries(PAGE_TITLES)
      .sort((a, b) => b[0].length - a[0].length)
      .find(
        ([path]) =>
          pathname === path || pathname.startsWith(`${path}/`),
      )?.[1] ?? 'Admin'

  const handleExport = () => {
    window.print()
  }

  return (
    <header
      data-testid="admin-header"
      className="h-14 flex items-center gap-4 px-6 bg-card border-b border-divider sticky top-0 z-10"
    >
      <h1 className="font-display text-lg font-semibold text-heading">
        {title}
      </h1>

      <div className="flex-1" />

      <div className="flex items-center gap-1 bg-bg rounded-card p-1">
        {DATE_PRESETS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            data-testid={`date-preset-${value}`}
            onClick={() => setPreset(value)}
            className={cn(
              'px-3 h-7 text-xs rounded-chip transition-colors font-medium',
              preset === value
                ? 'bg-white text-heading shadow-sm'
                : 'text-muted hover:text-heading',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleExport}
        data-testid="export-report-btn"
        className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-brand border border-divider rounded-card bg-white hover:bg-bg transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Export
      </button>
    </header>
  )
}
