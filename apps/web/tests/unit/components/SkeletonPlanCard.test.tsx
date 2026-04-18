import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SkeletonPlanCard } from '@/components/phases/phase4/SkeletonPlanCard'
import type { GenerationPlan } from '@/types'

const plan: GenerationPlan = {
  totalFiles: 32,
  totalBatches: 6,
  estimatedMs: 28000,
  fileList: ['/a.ts'],
  agentBreakdown: [
    { agentType: 'schema', fileCount: 4 },
    { agentType: 'backend', fileCount: 14 },
  ],
}

describe('SkeletonPlanCard', () => {
  it('shows totalFiles, totalBatches, estimated seconds, and chips', () => {
    render(<SkeletonPlanCard plan={plan} isVisible />)
    expect(screen.getByTestId('generation-plan-summary')).toHaveTextContent('32 files across 6 batches')
    expect(screen.getByText(/Estimated time: 28s/)).toBeInTheDocument()
    expect(screen.getByTestId('agent-chip-schema')).toHaveTextContent('schema: 4 files')
  })

  it('shows shimmer when plan is null', () => {
    const { container } = render(<SkeletonPlanCard plan={null} isVisible />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})
