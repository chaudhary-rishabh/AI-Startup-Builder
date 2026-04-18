import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { KPICards } from '@/components/phases/phase6/KPICards'

describe('KPICards', () => {
  const kpis = { activeUsers: 1200, retentionRate: 0.76, churnPercent: 0.042, mrr: 1240 }

  it('formats labels and values', () => {
    render(<KPICards kpis={kpis} isStreaming={false} />)
    expect(screen.getByText('Active Users')).toBeInTheDocument()
    expect(screen.getByText('1,200')).toBeInTheDocument()
    expect(screen.getByText('76%')).toBeInTheDocument()
    expect(screen.getByText('4.2%')).toBeInTheDocument()
    expect(screen.getByText('$1,240')).toBeInTheDocument()
  })

  it('applies shimmer when streaming', () => {
    const { container } = render(<KPICards kpis={kpis} isStreaming />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })
})
