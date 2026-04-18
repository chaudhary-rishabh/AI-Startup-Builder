import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SystemDesignCards } from '@/components/phases/phase2/SystemDesignCards'

const techStack = [
  { category: 'frontend', name: 'Next.js 15', reasoning: 'RSC', docsUrl: 'https://nextjs.org' },
  { category: 'database', name: 'PostgreSQL', reasoning: 'Reliable' },
] as const

const apiEndpoints = [
  { method: 'GET', route: '/api/a', description: 'Get all' },
  { method: 'POST', route: '/api/a', description: 'Create' },
  { method: 'DELETE', route: '/api/a/:id', description: 'Delete' },
] as const

describe('SystemDesignCards', () => {
  it('renders one card per tech stack with details', () => {
    render(
      <SystemDesignCards
        techStack={[...techStack]}
        apiEndpoints={[...apiEndpoints]}
        isStreaming={false}
      />,
    )
    expect(screen.getByText('Next.js 15')).toBeInTheDocument()
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Docs/i })).toBeInTheDocument()
  })

  it('renders endpoints table and method badges', () => {
    const { container } = render(
      <SystemDesignCards
        techStack={[...techStack]}
        apiEndpoints={[...apiEndpoints]}
        isStreaming={false}
      />,
    )
    expect(screen.getAllByText('/api/a').length).toBeGreaterThan(0)
    expect(screen.getByText('GET')).toBeInTheDocument()
    expect(screen.getByText('POST')).toBeInTheDocument()
    expect(screen.getByText('DELETE')).toBeInTheDocument()
    expect(container.querySelector('.bg-success\\/10')).toBeInTheDocument()
    expect(container.querySelector('.bg-info\\/10')).toBeInTheDocument()
    expect(container.querySelector('.bg-error\\/10')).toBeInTheDocument()
  })

  it('streaming renders raw text', () => {
    render(<SystemDesignCards techStack={[]} apiEndpoints={[]} isStreaming={true} streamedText="stream text" />)
    expect(screen.getByText('stream text')).toBeInTheDocument()
  })
})
