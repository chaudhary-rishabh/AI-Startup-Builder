import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BuildModeSelector } from '@/components/dashboard/BuildModeSelector'

describe('BuildModeSelector', () => {
  it('renders 3 cards', () => {
    render(<BuildModeSelector value="copilot" onChange={vi.fn()} />)
    expect(screen.getByText('Autopilot')).toBeInTheDocument()
    expect(screen.getByText('Copilot')).toBeInTheDocument()
    expect(screen.getByText('Manual')).toBeInTheDocument()
  })

  it('copilot has most popular badge', () => {
    render(<BuildModeSelector value="copilot" onChange={vi.fn()} />)
    expect(screen.getByText('Most popular')).toBeInTheDocument()
  })

  it('clicking autopilot calls onChange', () => {
    const onChange = vi.fn()
    render(<BuildModeSelector value="copilot" onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: /autopilot/i }))
    expect(onChange).toHaveBeenCalledWith('autopilot')
  })

  it('selected has border-brand class', () => {
    render(<BuildModeSelector value="manual" onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: /manual/i }).className).toContain('border-brand')
  })

  it('arrow keys cycle selection', () => {
    const onChange = vi.fn()
    render(<BuildModeSelector value="copilot" onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: /copilot/i }), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalled()
  })

  it('space/enter triggers onChange', () => {
    const onChange = vi.fn()
    render(<BuildModeSelector value="copilot" onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: /manual/i }), { key: 'Enter' })
    expect(onChange).toHaveBeenCalled()
  })
})
