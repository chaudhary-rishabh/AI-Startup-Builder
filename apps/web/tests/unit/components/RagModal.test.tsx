import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RagModal } from '@/components/rag/RagModal'

function wrap(ui: ReactNode): JSX.Element {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>
}

describe('RagModal', () => {
  it('shows tabs and document list on upload tab', async () => {
    render(wrap(<RagModal open onOpenChange={vi.fn()} />))
    expect(await screen.findByText('Upload')).toBeInTheDocument()
    expect(screen.getByText('URLs')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(await screen.findByText('business-plan.pdf')).toBeInTheDocument()
  })

  it('settings tab shows delete all control', async () => {
    render(wrap(<RagModal open onOpenChange={vi.fn()} />))
    await userEvent.click(screen.getByTestId('rag-tab-settings'))
    expect(screen.getByText('Delete All Documents')).toBeInTheDocument()
  })
})
