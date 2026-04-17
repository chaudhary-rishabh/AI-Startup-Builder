import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { StatCards } from '@/components/dashboard/StatCards'

let tokenValue = 38420
let loading = false

vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    isLoading: loading,
    data: {
      projects: [
        { id: '1', currentPhase: 3 },
        { id: '2', currentPhase: 2 },
      ],
    },
  }),
}))

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQuery: () => ({ data: { tokensUsed: tokenValue } }),
  }
})

describe('StatCards', () => {
  it('renders 4 cards', () => {
    loading = false
    render(<StatCards />)
    expect(screen.getByText('Active Projects')).toBeInTheDocument()
    expect(screen.getByText('Phases Complete')).toBeInTheDocument()
    expect(screen.getByText('Agents Run')).toBeInTheDocument()
    expect(screen.getByText('Tokens Used')).toBeInTheDocument()
  })

  it('shows active project count', () => {
    loading = false
    render(<StatCards />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('formats tokens as K', () => {
    loading = false
    tokenValue = 38420
    render(<StatCards />)
    expect(screen.getByText('38.4K')).toBeInTheDocument()
  })

  it('formats tokens as M', () => {
    loading = false
    tokenValue = 1_200_000
    render(<StatCards />)
    expect(screen.getByText('1.2M')).toBeInTheDocument()
  })

  it('shows shimmer when loading', () => {
    loading = true
    const { container } = render(<StatCards />)
    expect(container.querySelector('.shimmer')).toBeTruthy()
    loading = false
  })
})
