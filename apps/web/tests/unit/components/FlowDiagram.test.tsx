import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FlowDiagram } from '@/components/phases/phase2/FlowDiagram'

const steps = [
  { id: 's1', type: 'start', label: 'Start' },
  { id: 's2', type: 'action', label: 'Action step' },
  { id: 's3', type: 'decision', label: 'Decision?' },
  { id: 's4', type: 'result', label: 'Result', isDropOffRisk: true },
] as const

describe('FlowDiagram', () => {
  it('renders action/decision/result shapes and connectors', () => {
    const { container } = render(<FlowDiagram flowSteps={[...steps]} isStreaming={false} />)
    expect(screen.getByText('Action step')).toBeInTheDocument()
    expect(screen.getByText('Decision?')).toBeInTheDocument()
    expect(screen.getByText('Result')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-testid="flow-connector"]').length).toBeGreaterThan(0)
  })

  it('shows drop-off warning', () => {
    render(<FlowDiagram flowSteps={[...steps]} isStreaming={false} />)
    expect(screen.getByText(/Drop-off risk/)).toBeInTheDocument()
  })

  it('streaming shows raw text and empty list returns null', () => {
    const { rerender, container } = render(
      <FlowDiagram flowSteps={[]} isStreaming={true} streamedText="streaming flow" />,
    )
    expect(screen.getByText('streaming flow')).toBeInTheDocument()
    rerender(<FlowDiagram flowSteps={[]} isStreaming={false} />)
    expect(container).toBeEmptyDOMElement()
  })
})
