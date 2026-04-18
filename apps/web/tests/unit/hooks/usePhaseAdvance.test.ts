import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { usePhaseAdvance } from '@/hooks/usePhaseAdvance'

const advancePhaseMock = vi.fn()
const pushMock = vi.fn()

vi.mock('@/api/projects.api', async () => {
  const actual = await vi.importActual('@/api/projects.api')
  return {
    ...actual,
    advancePhase: (...args: unknown[]) => advancePhaseMock(...args),
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

describe('usePhaseAdvance', () => {
  it('canAdvance=true in autopilot when all agents complete', () => {
    const { result } = renderHook(
      () =>
        usePhaseAdvance({
          projectId: 'proj-1',
          currentPhase: 1,
          buildMode: 'autopilot',
          allAgentsComplete: true,
        }),
      { wrapper: makeWrapper() },
    )
    expect(result.current.canAdvance).toBe(true)
  })

  it('canAdvance=false in autopilot when agents not complete', () => {
    const { result } = renderHook(
      () =>
        usePhaseAdvance({
          projectId: 'proj-1',
          currentPhase: 1,
          buildMode: 'autopilot',
          allAgentsComplete: false,
        }),
      { wrapper: makeWrapper() },
    )
    expect(result.current.canAdvance).toBe(false)
  })

  it('canAdvance=false in copilot when copilotAnswered is false', () => {
    const { result } = renderHook(
      () =>
        usePhaseAdvance({
          projectId: 'proj-1',
          currentPhase: 1,
          buildMode: 'copilot',
          allAgentsComplete: true,
          copilotAnswered: false,
        }),
      { wrapper: makeWrapper() },
    )
    expect(result.current.canAdvance).toBe(false)
  })

  it('canAdvance=true in copilot when all done and copilot answered', () => {
    const { result } = renderHook(
      () =>
        usePhaseAdvance({
          projectId: 'proj-1',
          currentPhase: 1,
          buildMode: 'copilot',
          allAgentsComplete: true,
          copilotAnswered: true,
        }),
      { wrapper: makeWrapper() },
    )
    expect(result.current.canAdvance).toBe(true)
  })

  it('showCopilotCard only in copilot mode when all done and not answered', () => {
    const copilot = renderHook(
      () =>
        usePhaseAdvance({
          projectId: 'p',
          currentPhase: 1,
          buildMode: 'copilot',
          allAgentsComplete: true,
          copilotAnswered: false,
        }),
      { wrapper: makeWrapper() },
    )
    expect(copilot.result.current.showCopilotCard).toBe(true)

    const autopilot = renderHook(
      () =>
        usePhaseAdvance({
          projectId: 'p',
          currentPhase: 1,
          buildMode: 'autopilot',
          allAgentsComplete: true,
        }),
      { wrapper: makeWrapper() },
    )
    expect(autopilot.result.current.showCopilotCard).toBe(false)
  })

  it('advance calls api and router push', async () => {
    advancePhaseMock.mockResolvedValueOnce({ previousPhase: 1, currentPhase: 2 })
    const { result } = renderHook(
      () =>
        usePhaseAdvance({
          projectId: 'p1',
          currentPhase: 1,
          buildMode: 'autopilot',
          allAgentsComplete: true,
        }),
      { wrapper: makeWrapper() },
    )
    await result.current.advance()
    expect(advancePhaseMock).toHaveBeenCalledWith('p1', 2)
    expect(pushMock).toHaveBeenCalledWith('/project/p1/plan')
  })
})
