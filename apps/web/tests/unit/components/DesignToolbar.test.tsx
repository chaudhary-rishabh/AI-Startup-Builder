import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DesignToolbar } from '@/components/phases/phase3/DesignToolbar'

const push = vi.fn()
const switchToDev = vi.fn()
const advancePhaseMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
  }),
}))

vi.mock('@/api/projects.api', () => ({
  advancePhase: (...args: unknown[]) => advancePhaseMock(...args),
}))

vi.mock('@/hooks/useDesignMode', () => ({
  useDesignMode: () => ({
    mode: 'design',
    switchToDesign: vi.fn(),
    switchToDev,
    isModeTransitioning: false,
  }),
}))

describe('DesignToolbar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    push.mockReset()
    switchToDev.mockReset()
    advancePhaseMock.mockReset()
    advancePhaseMock.mockResolvedValue({ previousPhase: 3, currentPhase: 4 })
  })

  it('hands off to phase 4 and pushes after transition delay', async () => {
    const setZoom = vi.fn()
    render(
      <DesignToolbar
        projectId="proj-1"
        screenCount={3}
        zoom={1}
        setZoom={setZoom}
        viewportWidth={1440}
        setViewportWidth={vi.fn()}
        onGenerateAll={vi.fn(async () => {})}
        isGeneratingAll={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Hand Off/i }))
    await vi.runAllTimersAsync()

    expect(advancePhaseMock).toHaveBeenCalledWith('proj-1', 4)
    expect(switchToDev).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/project/proj-1/build')
  })

  it('clamps zoom controls between 25 and 400 percent', () => {
    let zoom = 0.25
    const setZoom = vi.fn((updater: ((prev: number) => number) | number) => {
      zoom = typeof updater === 'function' ? updater(zoom) : updater
    })

    render(
      <DesignToolbar
        projectId="proj-1"
        screenCount={3}
        zoom={zoom}
        setZoom={setZoom}
        viewportWidth={1440}
        setViewportWidth={vi.fn()}
        onGenerateAll={vi.fn(async () => {})}
        isGeneratingAll={false}
      />,
    )

    fireEvent.click(screen.getByLabelText('Zoom out'))
    expect(zoom).toBe(0.25)
  })
})
