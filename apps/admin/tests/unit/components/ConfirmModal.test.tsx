import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { vi } from 'vitest'

describe('ConfirmModal', () => {
  it('does not render when open=false', () => {
    render(
      <ConfirmModal
        open={false}
        onOpenChange={vi.fn()}
        title="Test"
        description="Are you sure?"
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.queryByText('Test')).not.toBeInTheDocument()
  })

  it('renders title and description when open=true', () => {
    render(
      <ConfirmModal
        open={true}
        onOpenChange={vi.fn()}
        title="Delete user"
        description="This cannot be undone."
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByText('Delete user')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('confirm button uses error colours for danger variant', () => {
    render(
      <ConfirmModal
        open={true}
        onOpenChange={vi.fn()}
        title="T"
        description="D"
        variant="danger"
        onConfirm={vi.fn()}
      />,
    )
    const confirmBtn = screen.getByRole('button', { name: /confirm/i })
    expect(confirmBtn.className).toMatch(/bg-error|text-white/)
  })

  it('clicking confirm calls onConfirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(
      <ConfirmModal
        open={true}
        onOpenChange={vi.fn()}
        title="T"
        description="D"
        onConfirm={onConfirm}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce())
  })

  it('clicking cancel calls onOpenChange(false)', () => {
    const onOpenChange = vi.fn()
    render(
      <ConfirmModal
        open={true}
        onOpenChange={onOpenChange}
        title="T"
        description="D"
        onConfirm={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows spinner inside confirm button when isLoading=true', () => {
    render(
      <ConfirmModal
        open={true}
        onOpenChange={vi.fn()}
        title="T"
        description="D"
        onConfirm={vi.fn()}
        isLoading={true}
      />,
    )
    expect(document.querySelector('.animate-spin')).toBeTruthy()
  })
})
