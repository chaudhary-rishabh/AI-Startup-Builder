import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DeployWizard } from '@/components/phases/phase5/DeployWizard'

beforeEach(() => {
  vi.stubGlobal('open', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

function renderWizard(ui: ReactElement): ReturnType<typeof render> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

vi.mock('@/hooks/useAgentRun', () => ({
  useAgentRun: () => ({
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
  }),
}))

describe('DeployWizard', () => {
  it('shows five step labels and enables continue after platform select', async () => {
    renderWizard(
      <DeployWizard
        projectId="proj-1"
        projectName="P"
        allTestsPassed={false}
        deployedUrl={null}
        onDeployComplete={vi.fn()}
        onDeployToken={vi.fn()}
      />,
    )
    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
    const cont = screen.getByTestId('wizard-step1-continue')
    expect(cont).toBeDisabled()
    await userEvent.click(screen.getByTestId('platform-vercel'))
    await waitFor(() => expect(cont).not.toBeDisabled())
  })

  it('disables deploy when tests not passed', async () => {
    renderWizard(
      <DeployWizard
        projectId="proj-1"
        projectName="P"
        allTestsPassed={false}
        deployedUrl={null}
        onDeployComplete={vi.fn()}
        onDeployToken={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByTestId('platform-vercel'))
    await userEvent.click(screen.getByTestId('wizard-step1-continue'))
    await userEvent.click(screen.getByRole('button', { name: /Vercel/i }))
    await waitFor(() => expect(screen.getByTestId('wizard-step2-continue')).not.toBeDisabled())
    await userEvent.click(screen.getByTestId('wizard-step2-continue'))
    await waitFor(() => expect(screen.getByTestId('env-value-DATABASE_URL')).toBeInTheDocument())
    await userEvent.type(screen.getByTestId('env-value-DATABASE_URL'), 'postgres://')
    await userEvent.type(screen.getByTestId('env-value-NEXTAUTH_SECRET'), 'secret')
    await userEvent.click(screen.getByTestId('wizard-step3-continue'))
    expect(screen.getByTestId('deploy-prod-btn')).toBeDisabled()
  })

  it('enables deploy when allTestsPassed after navigating to step 4', async () => {
    renderWizard(
      <DeployWizard
        projectId="proj-1"
        projectName="P"
        allTestsPassed
        deployedUrl={null}
        onDeployComplete={vi.fn()}
        onDeployToken={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByTestId('platform-vercel'))
    await userEvent.click(screen.getByTestId('wizard-step1-continue'))
    await userEvent.click(screen.getByRole('button', { name: /Vercel/i }))
    await waitFor(() => expect(screen.getByTestId('wizard-step2-continue')).not.toBeDisabled())
    await userEvent.click(screen.getByTestId('wizard-step2-continue'))
    await waitFor(() => expect(screen.getByTestId('env-value-DATABASE_URL')).toBeInTheDocument())
    const v1 = screen.getByTestId('env-value-DATABASE_URL')
    const v2 = screen.getByTestId('env-value-NEXTAUTH_SECRET')
    await userEvent.type(v1, 'postgres://')
    await userEvent.type(v2, 'secret')
    await userEvent.click(screen.getByTestId('wizard-step3-continue'))
    expect(screen.getByTestId('deploy-prod-btn')).not.toBeDisabled()
  })
})
