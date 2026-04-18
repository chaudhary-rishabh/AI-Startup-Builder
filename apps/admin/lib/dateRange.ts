import { format, subDays, subYears, endOfDay } from 'date-fns'
import type { DateRange, DateRangePreset } from '@/types'

export const presetToDateRange = (preset: DateRangePreset): DateRange => {
  const now = new Date()
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
  const today = fmt(endOfDay(now))

  switch (preset) {
    case '7d':
      return { preset, from: fmt(subDays(now, 7)), to: today }
    case '30d':
      return { preset, from: fmt(subDays(now, 30)), to: today }
    case '90d':
      return { preset, from: fmt(subDays(now, 90)), to: today }
    case '1y':
      return { preset, from: fmt(subYears(now, 1)), to: today }
    case 'custom':
      return { preset, from: fmt(subDays(now, 30)), to: today }
  }
}

export const formatCents = (cents: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)

export const formatNumber = (n: number): string => new Intl.NumberFormat('en-US').format(n)

export const formatPercent = (n: number, decimals = 1): string =>
  `${n > 0 ? '+' : ''}${n.toFixed(decimals)}%`
