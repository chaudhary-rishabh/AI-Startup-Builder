import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FeatureFlagsTable } from '@/components/settings/FeatureFlagsTable'
import type { FeatureFlag } from '@/types'
import { vi } from 'vitest'

const mockFlags: FeatureFlag[] = [
  {
    id: 'ff-1',
    key: 'design_mode',
    description: 'Enable Figma-style design canvas in Phase 3',
    enabled: true,
    rolloutPercent: 100,
    planRestriction: [],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ff-2',
    key: 'multi_model_select',
    description: 'Let users choose between Claude and GPT-4o',
    enabled: false,
    rolloutPercent: 0,
    planRestriction: ['enterprise'],
    updatedAt: new Date().toISOString(),
  },
]

describe('FeatureFlagsTable', () => {
  it('renders all feature flag rows', () => {
    render(
      <FeatureFlagsTable flags={mockFlags} isLoading={false} onUpdate={vi.fn()} />,
    )
    expect(screen.getByText('design_mode')).toBeInTheDocument()
    expect(screen.getByText('multi_model_select')).toBeInTheDocument()
  })

  it('shows description text for each flag', () => {
    render(
      <FeatureFlagsTable flags={mockFlags} isLoading={false} onUpdate={vi.fn()} />,
    )
    expect(screen.getByText(/Figma-style design canvas/i)).toBeInTheDocument()
  })

  it('enabled flag has switch in checked state', () => {
    render(
      <FeatureFlagsTable flags={mockFlags} isLoading={false} onUpdate={vi.fn()} />,
    )
    const switches = screen.getAllByRole('switch')
    const enabledSwitch = switches.find(
      (s) => s.getAttribute('aria-checked') === 'true',
    )
    expect(enabledSwitch).toBeDefined()
  })

  it('toggling switch calls onUpdate with new enabled state', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(
      <FeatureFlagsTable flags={mockFlags} isLoading={false} onUpdate={onUpdate} />,
    )
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[0])
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('ff-1', { enabled: false })
    })
  })

  it('rollout slider disabled when flag is disabled', () => {
    render(
      <FeatureFlagsTable flags={mockFlags} isLoading={false} onUpdate={vi.fn()} />,
    )
    const sliders = screen.getAllByRole('slider')
    const disabledSlider = sliders.find((s) => s.hasAttribute('disabled'))
    expect(disabledSlider).toBeDefined()
  })

  it('plan restriction shows "All plans" when planRestriction is empty', () => {
    render(
      <FeatureFlagsTable flags={mockFlags} isLoading={false} onUpdate={vi.fn()} />,
    )
    expect(screen.getByText(/all plans/i)).toBeInTheDocument()
  })

  it('plan restriction shows plan chips when restricted', () => {
    render(
      <FeatureFlagsTable flags={mockFlags} isLoading={false} onUpdate={vi.fn()} />,
    )
    expect(screen.getByText('ENTERPRISE')).toBeInTheDocument()
  })

  it('renders rollout info card above table', () => {
    render(
      <FeatureFlagsTable flags={mockFlags} isLoading={false} onUpdate={vi.fn()} />,
    )
    expect(screen.getByText(/user ID hash/i)).toBeInTheDocument()
  })

  it('renders shimmer rows when isLoading=true', () => {
    const { container } = render(
      <FeatureFlagsTable flags={[]} isLoading={true} onUpdate={vi.fn()} />,
    )
    expect(container.querySelectorAll('.shimmer').length).toBeGreaterThan(0)
  })

  it('100% rollout displayed for enabled flags', () => {
    render(
      <FeatureFlagsTable flags={mockFlags} isLoading={false} onUpdate={vi.fn()} />,
    )
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
