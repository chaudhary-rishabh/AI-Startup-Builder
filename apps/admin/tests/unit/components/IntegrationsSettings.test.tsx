import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings'
import type { IntegrationKey } from '@/types'
import { vi } from 'vitest'

const mockKeys: IntegrationKey[] = [
  {
    service: 'minimax',
    label: 'MiniMax (Phase 1–3, 6 agents)',
    apiKey: 'mm-••••••••1234',
    isSet: true,
    lastValidatedAt: new Date().toISOString(),
    validationStatus: 'valid',
  },
  {
    service: 'pinecone',
    label: 'Pinecone (Vector DB)',
    apiKey: '',
    isSet: false,
    lastValidatedAt: null,
    validationStatus: 'unchecked',
  },
]

describe('IntegrationsSettings', () => {
  it('renders all integration rows', () => {
    render(
      <IntegrationsSettings
        keys={mockKeys}
        isLoading={false}
        onUpdate={vi.fn()}
        onValidate={vi.fn()}
      />,
    )
    expect(screen.getByText('MiniMax (Phase 1–3, 6 agents)')).toBeInTheDocument()
    expect(screen.getByText('Pinecone (Vector DB)')).toBeInTheDocument()
  })

  it('valid integration shows green badge', () => {
    render(
      <IntegrationsSettings
        keys={mockKeys}
        isLoading={false}
        onUpdate={vi.fn()}
        onValidate={vi.fn()}
      />,
    )
    expect(screen.getByText('Valid ✓')).toBeInTheDocument()
  })

  it('unchecked integration shows "Unchecked" badge', () => {
    render(
      <IntegrationsSettings
        keys={mockKeys}
        isLoading={false}
        onUpdate={vi.fn()}
        onValidate={vi.fn()}
      />,
    )
    expect(screen.getByText(/unchecked/i)).toBeInTheDocument()
  })

  it('Validate button calls onValidate with service name', async () => {
    const onValidate = vi
      .fn()
      .mockResolvedValue({ valid: true, message: 'Valid' })
    render(
      <IntegrationsSettings
        keys={mockKeys}
        isLoading={false}
        onUpdate={vi.fn()}
        onValidate={onValidate}
      />,
    )
    const validateBtns = screen.getAllByRole('button', { name: /validate/i })
    fireEvent.click(validateBtns[0])
    await waitFor(() => expect(onValidate).toHaveBeenCalledWith('minimax'))
  })

  it('security note visible at bottom of page', () => {
    render(
      <IntegrationsSettings
        keys={mockKeys}
        isLoading={false}
        onUpdate={vi.fn()}
        onValidate={vi.fn()}
      />,
    )
    expect(screen.getByText(/AES-256/i)).toBeInTheDocument()
  })

  it('masked API key value shown in input', () => {
    render(
      <IntegrationsSettings
        keys={mockKeys}
        isLoading={false}
        onUpdate={vi.fn()}
        onValidate={vi.fn()}
      />,
    )
    expect(
      screen.getByDisplayValue('mm-••••••••1234'),
    ).toBeInTheDocument()
  })
})
