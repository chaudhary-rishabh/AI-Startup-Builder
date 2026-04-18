import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, describe, expect, it, vi } from 'vitest'

import { BillingPortal } from '@/components/settings/BillingPortal'

const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

describe('BillingPortal', () => {
  it('renders plan area and opens portal', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <BillingPortal />
      </QueryClientProvider>,
    )
    expect(await screen.findByText(/pro plan/i)).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('manage-billing-btn'))
    expect(openSpy).toHaveBeenCalledWith('https://billing.stripe.com/session/test', '_blank', 'noopener,noreferrer')
  })

  it('formats invoice amount', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <BillingPortal />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('$29.00')).toBeInTheDocument()
  })
})

afterAll(() => {
  openSpy.mockRestore()
})
