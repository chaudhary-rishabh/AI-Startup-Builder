'use client'

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { presetToDateRange } from '@/lib/dateRange'
import type { DateRange, DateRangePreset } from '@/types'

interface DateRangeContextValue {
  preset: DateRangePreset
  dateRange: DateRange
  setPreset: (preset: DateRangePreset) => void
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null)

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<DateRangePreset>('30d')
  const [dateRange, setDateRange] = useState<DateRange>(
    () => presetToDateRange('30d'),
  )

  const setPreset = (p: DateRangePreset) => {
    setPresetState(p)
    setDateRange(presetToDateRange(p))
  }

  return (
    <DateRangeContext.Provider value={{ preset, dateRange, setPreset }}>
      {children}
    </DateRangeContext.Provider>
  )
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext)
  if (!ctx) throw new Error('useDateRange must be inside DateRangeProvider')
  return ctx
}
