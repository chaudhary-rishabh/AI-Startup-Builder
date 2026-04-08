import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { ConfirmDialog } from '../../src/components/custom/ConfirmDialog'

// Minimal props for a default render
const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  title: 'Delete Project',
  description: 'This action cannot be undone.',
  onConfirm: vi.fn(),
}

describe('ConfirmDialog', () => {
  it('does not render dialog content when open=false', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete Project')).not.toBeInTheDocument()
  })

  it('renders title when open=true', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('Delete Project')).toBeInTheDocument()
  })

  it('renders description when open=true', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument()
  })

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Confirm"
        onConfirm={onConfirm}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    })

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onOpenChange(false) when Cancel is clicked', () => {
    const onOpenChange = vi.fn()
    render(<ConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders the confirm button with the custom label', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Archive forever" />)
    expect(screen.getByRole('button', { name: 'Archive forever' })).toBeInTheDocument()
  })

  it('confirm button has destructive (red) styles when variant=destructive', () => {
    render(<ConfirmDialog {...defaultProps} variant="destructive" confirmLabel="Delete" />)
    const confirmBtn = screen.getByRole('button', { name: 'Delete' })
    expect(confirmBtn).toHaveClass('bg-red-600')
  })

  it('confirm button has brand (brown) styles for default variant', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Confirm" />)
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmBtn).toHaveClass('bg-brand')
  })

  it('shows "Processing…" text when loading=true', () => {
    render(<ConfirmDialog {...defaultProps} loading={true} confirmLabel="Confirm" />)
    expect(screen.getByText('Processing…')).toBeInTheDocument()
  })

  it('disables the confirm button when loading=true', () => {
    render(<ConfirmDialog {...defaultProps} loading={true} confirmLabel="Confirm" />)
    // The button containing "Processing…"
    const buttons = screen.getAllByRole('button')
    const confirmBtn = buttons.find((b) => b.textContent?.includes('Processing'))
    expect(confirmBtn).toBeDisabled()
  })

  it('disables the Cancel button when loading=true', () => {
    render(<ConfirmDialog {...defaultProps} loading={true} />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})
