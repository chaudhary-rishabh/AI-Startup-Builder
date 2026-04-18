import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TestRunner } from '@/components/phases/phase5/TestRunner'

const mockUseAgentRun = vi.fn()

vi.mock('@/hooks/useAgentRun', () => ({
  useAgentRun: (opts: { agentType: string; onComplete?: (o: Record<string, unknown>) => void }) => mockUseAgentRun(opts),
}))

describe('TestRunner', () => {
  it('shows Run Tests in empty state and forwards trigger', async () => {
    const trigger = vi.fn()
    mockUseAgentRun.mockImplementation((opts: { agentType: string }) => {
      if (opts.agentType === 'testing') {
        return {
          status: 'idle',
          streamedText: '',
          trigger,
          cancel: vi.fn(),
          reset: vi.fn(),
          runId: null,
          docMode: null,
          crossChecks: [],
          tokensUsed: 0,
          isStreaming: false,
        }
      }
      return {
        status: 'idle',
        streamedText: '',
        trigger: vi.fn(),
        cancel: vi.fn(),
        reset: vi.fn(),
        runId: null,
        docMode: null,
        crossChecks: [],
        tokensUsed: 0,
        isStreaming: false,
      }
    })
    render(<TestRunner projectId="p1" onAllTestsPass={vi.fn()} />)
    await userEvent.click(screen.getByTestId('run-tests-btn'))
    expect(trigger).toHaveBeenCalled()
  })

  it('renders progress bar while running', () => {
    mockUseAgentRun.mockImplementation((opts: { agentType: string }) => {
      if (opts.agentType === 'testing') {
        return {
          status: 'running',
          streamedText: 'x',
          trigger: vi.fn(),
          cancel: vi.fn(),
          reset: vi.fn(),
          runId: 'r1',
          docMode: null,
          crossChecks: [],
          tokensUsed: 0,
          isStreaming: true,
        }
      }
      return {
        status: 'idle',
        streamedText: '',
        trigger: vi.fn(),
        cancel: vi.fn(),
        reset: vi.fn(),
        runId: null,
        docMode: null,
        crossChecks: [],
        tokensUsed: 0,
        isStreaming: false,
      }
    })
    render(<TestRunner projectId="p1" onAllTestsPass={vi.fn()} />)
    expect(screen.getByText(/Generating and running tests/)).toBeInTheDocument()
  })

  it('shows summary and failed test fix flow', async () => {
    mockUseAgentRun.mockImplementation((opts: { agentType: string; onComplete?: (o: Record<string, unknown>) => void }) => {
      if (opts.agentType === 'testing') {
        return {
          status: 'idle',
          streamedText: '',
          trigger: vi.fn(),
          cancel: vi.fn(),
          reset: vi.fn(),
          runId: null,
          docMode: null,
          crossChecks: [],
          tokensUsed: 0,
          isStreaming: false,
        }
      }
      return {
        status: 'idle',
        streamedText: '',
        trigger: vi.fn(),
        cancel: vi.fn(),
        reset: vi.fn(),
        runId: null,
        docMode: null,
        crossChecks: [],
        tokensUsed: 0,
        isStreaming: false,
      }
    })
    const onFix = vi.fn()
    render(<TestRunner projectId="p1" onAllTestsPass={vi.fn()} onFixTestRequest={onFix} />)
    const testingOpts = [...mockUseAgentRun.mock.calls]
      .reverse()
      .find((call) => (call[0] as { agentType: string }).agentType === 'testing')?.[0] as {
        onComplete?: (output: Record<string, unknown>) => void
      }
    act(() => {
      testingOpts?.onComplete?.({
        testResults: {
          passed: 1,
          failed: 1,
          skipped: 0,
          suites: [
            {
              name: 'Unit Tests',
              tests: [{ name: 'bad', status: 'failed', durationMs: 8, error: 'Error: boom' }],
            },
          ],
        },
      })
    })
    await waitFor(() => expect(screen.getByText(/1 Failed/)).toBeInTheDocument())
    await userEvent.click(screen.getByText('Unit Tests'))
    await userEvent.click(screen.getByText('bad'))
    await userEvent.click(screen.getByTestId('fix-test-btn'))
    expect(onFix).toHaveBeenCalled()
  })
})
