import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FeatureList } from '@/components/phases/phase2/FeatureList'
import type { MoSCoWFeature } from '@/types'

vi.mock('@/hooks/useInlineEdit', () => ({
  useInlineEdit: ({ initialValue, field }: { initialValue: string; field: string }) => ({
    value: initialValue,
    saveStatus: 'idle',
    contentEditableProps: {
      contentEditable: true as const,
      suppressContentEditableWarning: true as const,
      onInput: vi.fn(),
      onBlur: vi.fn(),
      onFocus: vi.fn(),
      style: {},
      'data-field': field,
    },
  }),
}))

const features: MoSCoWFeature[] = [
  {
    id: 'f1',
    name: 'Auth',
    priority: 'Must',
    description: 'Secure login',
    userStories: [{ id: 'us1', role: 'owner', want: 'login', soThat: 'secure app' }],
    acceptanceCriteria: ['Users can sign in'],
  },
  { id: 'f2', name: 'Export', priority: 'Should', description: 'CSV export' },
]

describe('FeatureList', () => {
  it('groups features and shows counts', () => {
    render(<FeatureList projectId="p1" features={features} isStreaming={false} onFeatureAdd={vi.fn()} />)
    expect(screen.getByText('Must Have')).toBeInTheDocument()
    expect(screen.getByText('Should Have')).toBeInTheDocument()
    expect(screen.getByText('Auth')).toBeInTheDocument()
    expect(screen.getByText('Must')).toBeInTheDocument()
  })

  it('expands card to show details and criteria', () => {
    render(<FeatureList projectId="p1" features={features} isStreaming={false} onFeatureAdd={vi.fn()} />)
    fireEvent.click(screen.getAllByLabelText('Expand feature details')[0]!)
    expect(screen.getByText('Secure login')).toBeInTheDocument()
    expect(screen.getByText('As a owner, I want login, so that secure app')).toBeInTheDocument()
    expect(screen.getByText('Users can sign in')).toBeInTheDocument()
  })

  it('opens add feature modal', () => {
    render(<FeatureList projectId="p1" features={features} isStreaming={false} onFeatureAdd={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Add Feature/i }))
    expect(screen.getByText('Save Feature')).toBeInTheDocument()
  })
})
