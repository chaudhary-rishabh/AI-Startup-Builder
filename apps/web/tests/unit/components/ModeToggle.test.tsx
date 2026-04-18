import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ModeToggle } from '@/components/layout/ModeToggle'
import { useProjectStore } from '@/store/projectStore'

describe('ModeToggle', () => {
  it('renders Design and Dev buttons', () => {
    render(<ModeToggle />)
    expect(screen.getByRole('button', { name: /design/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dev/i })).toBeInTheDocument()
  })

  it('clicking Dev switches mode', () => {
    render(<ModeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /dev/i }))
    expect(useProjectStore.getState().mode).toBe('dev')
  })

  it('clicking Design switches mode back', () => {
    vi.useFakeTimers()
    useProjectStore.getState().setMode('dev')
    vi.advanceTimersByTime(400)
    render(<ModeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /design/i }))
    vi.advanceTimersByTime(400)
    vi.useRealTimers()
    expect(useProjectStore.getState().mode).toBe('design')
  })

  it('renders sliding pill behind mode buttons', () => {
    const { container } = render(<ModeToggle />)
    expect(container.querySelector('.absolute.rounded-full')).toBeTruthy()
  })
})
