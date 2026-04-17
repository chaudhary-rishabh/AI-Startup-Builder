import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CrossCheckBadge } from '@/components/phases/CrossCheckBadge'

describe('CrossCheckBadge', () => {
  it('renders nothing when empty', () => {
    const { container } = render(<CrossCheckBadge crossChecks={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders green and amber badges', () => {
    render(
      <CrossCheckBadge
        crossChecks={[
          { type: 'cross_check', check: '1', passed: true, issues: [], runId: 'r1' },
          { type: 'cross_check', check: '2', passed: false, issues: ['Fix A'], runId: 'r1' },
        ]}
      />,
    )
    expect(screen.getByText(/Quality check 1 passed/)).toBeInTheDocument()
    expect(screen.getByText(/Check 2: 1 issue auto-fixed/)).toBeInTheDocument()
  })

  it('expands issues list when clicking amber badge', () => {
    render(
      <CrossCheckBadge
        crossChecks={[{ type: 'cross_check', check: '2', passed: false, issues: ['A', 'B'], runId: 'r1' }]}
      />,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })
})
