import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ProjectCard } from '@/components/dashboard/ProjectCard'
import type { Project } from '@/types'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

const sampleProject: Project = {
  id: 'proj-1',
  userId: 'u1',
  name: 'RestaurantIQ',
  description: 'desc',
  emoji: '🍽️',
  currentPhase: 2,
  status: 'active',
  isStarred: true,
  mode: 'design',
  buildMode: 'copilot',
  phaseProgress: { '1': 'complete', '2': 'active' },
  lastActiveAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
}

describe('ProjectCard', () => {
  const renderWithClient = (project: Project): void => {
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <ProjectCard project={project} />
      </QueryClientProvider>,
    )
  }

  it('renders name and emoji', () => {
    renderWithClient(sampleProject)
    expect(screen.getByText('RestaurantIQ')).toBeInTheDocument()
    expect(screen.getByText('🍽️')).toBeInTheDocument()
  })

  it('phase 1 and phase 2 badges map correctly', () => {
    renderWithClient({ ...sampleProject, currentPhase: 1 })
    expect(screen.getByText('Validate')).toBeInTheDocument()
    renderWithClient(sampleProject)
    expect(screen.getByText('Plan')).toBeInTheDocument()
  })

  it('progress bar renders 6 segments', () => {
    const client = new QueryClient()
    const { getAllByTestId } = render(
      <QueryClientProvider client={client}>
        <ProjectCard project={sampleProject} />
      </QueryClientProvider>,
    )
    expect(getAllByTestId('progress-segment')).toHaveLength(6)
  })

  it('continue button navigates to phase route', () => {
    renderWithClient(sampleProject)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(push).toHaveBeenCalledWith('/project/proj-1/plan')
  })

  it('build mode chip renders copilot', () => {
    renderWithClient(sampleProject)
    expect(screen.getByText('🤝 Copilot')).toBeInTheDocument()
  })

  it('menu opens and delete triggers confirm dialog', () => {
    renderWithClient(sampleProject)
    fireEvent.click(screen.getByRole('button', { name: /open project actions/i }))
    expect(screen.getByText('Delete')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Delete'))
    expect(screen.getByRole('dialog', { name: /confirm delete/i })).toBeInTheDocument()
  })
})
