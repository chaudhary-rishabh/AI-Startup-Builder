import { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BulkActions } from '@/components/users/BulkActions'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { vi } from 'vitest'

function Harness({
  onBulkSuspend,
}: {
  onBulkSuspend: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <BulkActions
        selectedIds={['u-1']}
        onClear={vi.fn()}
        onBulkSuspend={() => {
          onBulkSuspend()
          setOpen(true)
        }}
        onBulkExport={vi.fn()}
      />
      <ConfirmModal
        open={open}
        onOpenChange={setOpen}
        title="Suspend selected users"
        description="These accounts will be suspended immediately."
        confirmLabel="Suspend all"
        variant="danger"
        onConfirm={async () => {}}
      />
    </>
  )
}

describe('BulkActions', () => {
  it('renders count of selected users', () => {
    render(
      <BulkActions
        selectedIds={['u-1', 'u-2']}
        onClear={vi.fn()}
        onBulkSuspend={vi.fn()}
        onBulkExport={vi.fn()}
      />,
    )
    expect(screen.getByText(/2 users selected/i)).toBeInTheDocument()
  })

  it('Suspend Selected opens ConfirmModal when parent wires modal', async () => {
    const onBulkSuspend = vi.fn()
    render(<Harness onBulkSuspend={onBulkSuspend} />)
    fireEvent.click(screen.getByRole('button', { name: /suspend selected/i }))
    expect(onBulkSuspend).toHaveBeenCalledOnce()
    await waitFor(() =>
      expect(screen.getByText('Suspend selected users')).toBeInTheDocument(),
    )
  })

  it('Clear button calls onClear', () => {
    const onClear = vi.fn()
    render(
      <BulkActions
        selectedIds={['u-1']}
        onClear={onClear}
        onBulkSuspend={vi.fn()}
        onBulkExport={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^clear$/i }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('Export CSV calls onBulkExport', () => {
    const onBulkExport = vi.fn()
    render(
      <BulkActions
        selectedIds={['u-1', 'u-2', 'u-3']}
        onClear={vi.fn()}
        onBulkSuspend={vi.fn()}
        onBulkExport={onBulkExport}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }))
    expect(onBulkExport).toHaveBeenCalledOnce()
  })
})
