import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserDetailPanel } from '@/components/users/UserDetailPanel'

describe('UserDetailPanel', () => {

  function renderPanel(userId: string | null) {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={qc}>
        <UserDetailPanel userId={userId} onClose={() => {}} />
      </QueryClientProvider>,
    )
    return qc
  }

  it('renders null when userId is null', () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <UserDetailPanel userId={null} onClose={() => {}} />
      </QueryClientProvider>,
    )
    expect(container.firstChild).toBeNull()
  })

  it('5 tabs visible when userId provided', async () => {
    renderPanel('u-1')
    await waitFor(() => expect(screen.getByText('Priya Sharma')).toBeInTheDocument())
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Usage')).toBeInTheDocument()
    expect(screen.getByText('Billing')).toBeInTheDocument()
    expect(screen.getByText('Login History')).toBeInTheDocument()
  })

  it('Profile tab renders plan and status', async () => {
    renderPanel('u-1')
    await waitFor(() => expect(screen.getByText('Priya Sharma')).toBeInTheDocument())
    expect(document.body.textContent).toMatch(/PRO/)
    expect(document.body.textContent).toMatch(/active/i)
  })

  it('Suspend button triggers ConfirmModal', async () => {
    renderPanel('u-1')
    await waitFor(() => expect(screen.getByText('Priya Sharma')).toBeInTheDocument())
    const suspendButtons = screen.getAllByRole('button', { name: 'Suspend' })
    fireEvent.click(suspendButtons[suspendButtons.length - 1]!)
    expect(await screen.findByText('Suspend user')).toBeInTheDocument()
  })

  it('Impersonate button calls impersonateUser and opens window', async () => {
    const open = vi.fn()
    vi.stubGlobal('open', open)
    renderPanel('u-1')
    await waitFor(() => expect(screen.getByText('Priya Sharma')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Impersonate' }))
    await waitFor(() => {
      expect(open).toHaveBeenCalledWith(
        'http://localhost:3000/?impersonate=tok_test123',
        '_blank',
        'noopener,noreferrer',
      )
    })
  })

  it('Notes textarea saves on blur', async () => {
    renderPanel('u-1')
    await waitFor(() => expect(screen.getByText('Priya Sharma')).toBeInTheDocument())
    const ta = screen.getByPlaceholderText(/internal notes/i) as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: 'note-a' } })
    fireEvent.blur(ta)
    expect(ta.value).toBe('note-a')
  })
})
