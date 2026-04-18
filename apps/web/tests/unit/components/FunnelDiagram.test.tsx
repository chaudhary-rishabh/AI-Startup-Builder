import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FunnelDiagram, type FunnelStep } from '@/components/phases/phase6/FunnelDiagram'

const steps: FunnelStep[] = [
  { name: 'Acquisition', users: 10000, conversionRate: 100, dropOffRate: 40 },
  { name: 'Activation', users: 6000, conversionRate: 60, dropOffRate: 35 },
]

describe('FunnelDiagram', () => {
  it('renders steps and drop-off labels', () => {
    render(<FunnelDiagram steps={steps} />)
    expect(screen.getByText('Acquisition')).toBeInTheDocument()
    expect(screen.getByText('Activation')).toBeInTheDocument()
    expect(screen.getByText(/40% drop-off/)).toBeInTheDocument()
  })
})
