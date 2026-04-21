import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TokenBudgetBanner } from '@/components/common/TokenBudgetBanner'
import { CreditStateProvider } from '@/components/providers/CreditStateProvider'
import { useUIStore } from '@/store/uiStore'
import type { TokenBudget } from '@/types'

vi.mock('@/store/authStore', () => ({
  useAuthStore: (sel: (s: { isAuthenticated: boolean }) => unknown) =>
    sel({ isAuthenticated: true }),
}))

function renderWithBudget(budget: TokenBudget): ReturnType<typeof render> {
  const qc = new QueryClient()
  qc.setQueryData(['token-budget'], budget)
  return render(
    <QueryClientProvider client={qc}>
      <CreditStateProvider>
        <TokenBudgetBanner />
      </CreditStateProvider>
    </QueryClientProvider>,
  )
}

describe('TokenBudgetBanner', () => {
  beforeEach(() => {
    useUIStore.setState({ tokenWarning: null })
  })

  it('renders nothing when tokenWarning is null', () => {
    const { container } = render(<TokenBudgetBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders amber banner for 80%', () => {
    useUIStore.setState({
      tokenWarning: { percentUsed: 80, tokensRemaining: 2000, resetDate: 'May 1' },
    })
    render(<TokenBudgetBanner />)
    expect(screen.getByText(/80%/i)).toBeInTheDocument()
  })

  it('renders red banner for 95%', () => {
    useUIStore.setState({
      tokenWarning: { percentUsed: 95, tokensRemaining: 500, resetDate: 'May 1' },
    })
    render(<TokenBudgetBanner />)
    expect(screen.getByText(/5% of tokens remaining/i)).toBeInTheDocument()
  })

  it('dismiss button clears tokenWarning', () => {
    useUIStore.setState({
      tokenWarning: { percentUsed: 80, tokensRemaining: 2000, resetDate: 'May 1' },
    })
    render(<TokenBudgetBanner />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss budget warning/i }))
    expect(useUIStore.getState().tokenWarning).toBeNull()
  })

  it('upgrade plan link points to /settings/billing', () => {
    useUIStore.setState({
      tokenWarning: { percentUsed: 80, tokensRemaining: 2000, resetDate: 'May 1' },
    })
    render(<TokenBudgetBanner />)
    const link = screen.getByRole('link', { name: /upgrade plan/i })
    expect(link).toHaveAttribute('href', '/settings/billing')
  })

  it('formats tokens remaining with toLocaleString', () => {
    useUIStore.setState({
      tokenWarning: { percentUsed: 80, tokensRemaining: 12000, resetDate: 'May 1' },
    })
    render(<TokenBudgetBanner />)
    expect(screen.getByText(/12,000 tokens remaining/i)).toBeInTheDocument()
  })

  it('renders amber exhausted banner without dismiss', () => {
    useUIStore.setState({ tokenWarning: null })
    renderWithBudget({
      tokensUsed: 50_000,
      tokensLimit: 50_000,
      tokensRemaining: 0,
      bonusTokens: 0,
      effectiveLimit: 50_000,
      effectiveRemaining: 0,
      percentUsed: 100,
      planTier: 'free',
      currentMonth: '2026-04',
      resetAt: null,
      isUnlimited: false,
      warningThresholds: [],
      creditState: 'exhausted',
      isOneTimeCredits: true,
    })
    expect(screen.getByText(/50,000 free credits have been used/i)).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dismiss budget warning/i })).not.toBeInTheDocument()
  })
})
