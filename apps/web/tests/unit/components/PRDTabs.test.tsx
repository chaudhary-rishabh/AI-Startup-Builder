import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { PRDTabs } from '@/components/phases/phase2/PRDTabs'

const runState: Record<'prd' | 'user_flow' | 'system_design' | 'uiux', { status: 'idle' | 'running' | 'complete' | 'error' }> = {
  prd: { status: 'idle' },
  user_flow: { status: 'idle' },
  system_design: { status: 'idle' },
  uiux: { status: 'idle' },
}

vi.mock('@/hooks/useAgentRun', () => ({
  useAgentRun: ({ agentType }: { agentType: keyof typeof runState }) => ({
    status: runState[agentType]?.status ?? 'idle',
    runId: null,
    streamedText: '',
    docMode: null,
    crossChecks: [],
    tokensUsed: 0,
    isStreaming: runState[agentType].status === 'running',
    trigger: vi.fn(),
    cancel: vi.fn(),
    reset: vi.fn(),
  }),
}))

describe('PRDTabs', () => {
  beforeEach(() => {
    runState.prd!.status = 'idle'
    runState.user_flow!.status = 'idle'
    runState.system_design!.status = 'idle'
    runState.uiux!.status = 'idle'
    window.history.replaceState({}, '', 'http://localhost:3000/project/p1/plan')
  })

  it('renders all tabs and active underline', () => {
    render(<PRDTabs projectId="p1" buildMode="manual" onAllAgentsComplete={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'PRD' })).toHaveClass('border-brand')
    expect(screen.getByRole('button', { name: 'User Flow' })).toHaveClass('border-transparent')
    expect(screen.getByRole('button', { name: 'System Design' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'UI/UX' })).toBeInTheDocument()
  })

  it('clicking tab updates hash/query and switches content', () => {
    render(<PRDTabs projectId="p1" buildMode="manual" onAllAgentsComplete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'User Flow' }))
    expect(window.location.hash).toBe('#flow')
    expect(window.location.search).toContain('tab=flow')
  })

  it('auto-switches active tab when running', () => {
    runState.system_design!.status = 'running'
    render(<PRDTabs projectId="p1" buildMode="manual" onAllAgentsComplete={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'System Design' })).toHaveClass('border-brand')
  })

  it('shows running and complete dots', () => {
    runState.prd!.status = 'running'
    runState.user_flow!.status = 'complete'
    render(<PRDTabs projectId="p1" buildMode="manual" onAllAgentsComplete={vi.fn()} />)
    const prdButton = screen.getByRole('button', { name: 'PRD' })
    const flowButton = screen.getByRole('button', { name: 'User Flow' })
    expect(prdButton.querySelector('.bg-amber-400')).toBeInTheDocument()
    expect(flowButton.querySelector('.bg-success')).toBeInTheDocument()
  })

  it('shows regenerate on hover container', () => {
    render(<PRDTabs projectId="p1" buildMode="manual" onAllAgentsComplete={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Regenerate section/i })).toBeInTheDocument()
  })
})
