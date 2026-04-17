'use client'

import { useTokenBudget } from '@/hooks/useTokenBudget'

export function TokenBudgetWatcher(): null {
  useTokenBudget()
  return null
}
