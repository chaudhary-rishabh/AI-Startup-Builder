import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { FileTreeBatchProgress } from '@/hooks/useFileTree'
import { BatchProgressBar } from '@/components/phases/phase4/BatchProgressBar'

describe('BatchProgressBar', () => {
  it('returns null when progress is null', () => {
    const { container } = render(<BatchProgressBar progress={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows batch text, schema label, and teal fill width', () => {
    const progress: FileTreeBatchProgress = {
      current: 2,
      total: 7,
      agentType: 'schema_gen',
      isActive: true,
      filesGenerated: 1,
      estimatedBatchFiles: 5,
    }
    render(<BatchProgressBar progress={progress} />)
    expect(screen.getByText('Batch 2 of 7')).toBeInTheDocument()
    expect(screen.getByText('📐 Schema')).toBeInTheDocument()
    const fill = screen.getByTestId('batch-progress-fill')
    expect(fill.className).toMatch(/0D9488/)
    expect(fill.getAttribute('style')).toContain(`${(2 / 7) * 100}`)
  })
})
