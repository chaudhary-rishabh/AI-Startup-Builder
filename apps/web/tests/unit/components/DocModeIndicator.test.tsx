import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DocModeIndicator } from '@/components/phases/DocModeIndicator'

describe('DocModeIndicator', () => {
  it('renders nothing for null or none mode', () => {
    const { container, rerender } = render(<DocModeIndicator docMode={null} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<DocModeIndicator docMode={{ type: 'doc_mode', mode: 'none', docCount: 0, tokenCount: 0, runId: 'r1' }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders direct mode and formats K tokens', () => {
    render(<DocModeIndicator docMode={{ type: 'doc_mode', mode: 'direct', docCount: 2, tokenCount: 24000, runId: 'r1' }} />)
    expect(screen.getByText(/direct injection/i)).toBeInTheDocument()
    expect(screen.getByText(/24.0K/)).toBeInTheDocument()
  })

  it('renders contextual RAG text', () => {
    render(<DocModeIndicator docMode={{ type: 'doc_mode', mode: 'contextual_rag', docCount: 3, tokenCount: 10000, runId: 'r1' }} />)
    expect(screen.getByText(/contextual RAG/i)).toBeInTheDocument()
  })
})
