import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CopilotQuestionCard } from '@/components/phases/CopilotQuestionCard'

const submitMock = vi.fn()
vi.mock('@/api/agents.api', () => ({
  submitCopilotPreferences: (...args: unknown[]) => submitMock(...args),
}))

describe('CopilotQuestionCard', () => {
  it('renders all fields and prefill badge', () => {
    render(
      <CopilotQuestionCard
        projectId="p1"
        phase={1}
        episodicMemory={{ scale: 'MVP' }}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByText(/How big are you thinking/)).toBeInTheDocument()
    expect(screen.getByText(/Primary platform/)).toBeInTheDocument()
    expect(screen.getByLabelText(/color/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Backend preference/)).toBeInTheDocument()
    expect(screen.getByText(/Brand personality/)).toBeInTheDocument()
    expect(screen.getByText(/From last project/)).toBeInTheDocument()
  })

  it('submit calls api then onSubmit', async () => {
    const onSubmit = vi.fn()
    submitMock.mockResolvedValueOnce(undefined)
    render(<CopilotQuestionCard projectId="p1" phase={1} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /Continue to Phase 2/ }))
    await waitFor(() => expect(submitMock).toHaveBeenCalled())
    expect(onSubmit).toHaveBeenCalled()
  })

  it('skip link calls onSubmit without api', () => {
    const onSubmit = vi.fn()
    render(<CopilotQuestionCard projectId="p1" phase={1} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /Skip for now/ }))
    expect(onSubmit).toHaveBeenCalled()
  })
})
