'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { getTokenBudget } from '@/api/billing.api'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import type { CreditState } from '@/types'

export function useTokenBudget(): {
  budget: import('@/types').TokenBudget | undefined
  isLoading: boolean
  isExhausted: boolean
  isWarning: boolean
  creditState: CreditState
} {
  const setTokenWarning = useUIStore((state) => state.setTokenWarning)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const { data, isLoading } = useQuery({
    queryKey: ['token-budget'],
    queryFn: getTokenBudget,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const prevCreditRef = useRef<CreditState | null>(null)

  useEffect(() => {
    if (!data) {
      return
    }
    if (data.isUnlimited) {
      setTokenWarning(null)
      prevCreditRef.current = data.creditState
      return
    }

    if (data.creditState === 'exhausted') {
      setTokenWarning(null)
    }

    const cs = data.creditState
    if (cs === 'exhausted' && prevCreditRef.current !== 'exhausted') {
      toast.info('Your credits have been used — you can still access everything you built')
    }
    prevCreditRef.current = cs

    if (cs === 'warning_80' || cs === 'warning_95') {
      const pct = cs === 'warning_95' ? 95 : 80
      const resetLabel = data.resetAt
        ? new Date(data.resetAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        : '—'
      setTokenWarning({
        percentUsed: pct as 80 | 95,
        tokensRemaining: data.effectiveRemaining,
        resetDate: resetLabel,
      })
      return
    }
    setTokenWarning(null)
  }, [data, setTokenWarning])

  const creditState = data?.creditState ?? 'active'
  const isExhausted = creditState === 'exhausted'
  const isWarning = creditState === 'warning_80' || creditState === 'warning_95'

  return {
    budget: data,
    isLoading,
    isExhausted,
    isWarning,
    creditState,
  }
}
