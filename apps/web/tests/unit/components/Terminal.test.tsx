import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Terminal } from '@/components/phases/phase4/Terminal'
import type { TerminalLine } from '@/types'

const mk = (type: TerminalLine['type'], content: string): TerminalLine => ({
  id: crypto.randomUUID(),
  type,
  content,
  timestamp: new Date('2026-04-18T12:00:00Z'),
})

describe('Terminal', () => {
  it('renders header', () => {
    render(<Terminal lines={[]} onClear={vi.fn()} />)
    expect(screen.getByText('Terminal')).toBeInTheDocument()
  })

  it('clear button empties lines', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    const { rerender } = render(<Terminal lines={[mk('info', 'x')]} onClear={onClear} />)
    await user.click(screen.getByRole('button', { name: /Clear terminal/i }))
    expect(onClear).toHaveBeenCalled()
    rerender(<Terminal lines={[]} onClear={onClear} />)
  })

  it('collapse chevron hides body', async () => {
    const user = userEvent.setup()
    render(<Terminal lines={[mk('system', 's')]} onClear={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /Collapse terminal/i }))
    expect(screen.queryByText('s')).not.toBeInTheDocument()
  })

  it('formats timestamp as HH:MM:SS', () => {
    render(<Terminal lines={[mk('output', 'hello')]} onClear={vi.fn()} />)
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument()
  })
})
