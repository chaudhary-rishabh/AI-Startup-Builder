'use client'

import { createContext, useContext, type ReactNode } from 'react'

import { useTokenBudget } from '@/hooks/useTokenBudget'
import type { CreditState } from '@/types'

interface CreditStateContextValue {
  isExhausted: boolean
  isWarning: boolean
  creditState: CreditState
  effectiveRemaining: number
  planTier: string
  isOneTimeCredits: boolean
  resetAt: string | null
  currentMonth: string
}

const CreditStateContext = createContext<CreditStateContextValue>({
  isExhausted: false,
  isWarning: false,
  creditState: 'active',
  effectiveRemaining: 0,
  planTier: 'free',
  isOneTimeCredits: true,
  resetAt: null,
  currentMonth: '',
})

export function CreditStateProvider({ children }: { children: ReactNode }): JSX.Element {
  const { budget, isExhausted, isWarning, creditState } = useTokenBudget()

  return (
    <CreditStateContext.Provider
      value={{
        isExhausted,
        isWarning,
        creditState: creditState ?? 'active',
        effectiveRemaining: budget?.effectiveRemaining ?? 0,
        planTier: budget?.planTier ?? 'free',
        isOneTimeCredits: budget?.isOneTimeCredits ?? true,
        resetAt: budget?.resetAt ?? null,
        currentMonth: budget?.currentMonth ?? '',
      }}
    >
      {children}
    </CreditStateContext.Provider>
  )
}

export function useCreditState(): CreditStateContextValue {
  return useContext(CreditStateContext)
}
