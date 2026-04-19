import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GeneralSettings } from '@/components/settings/GeneralSettings'
import type { GeneralSettings as GeneralSettingsType } from '@/types'
import { vi } from 'vitest'

vi.mock('@/lib/api/settings.api', () => ({
  uploadLogo: vi.fn().mockResolvedValue({ logoUrl: 'https://x/logo.png' }),
}))

const mockSettings: GeneralSettingsType = {
  platformName: 'AI Startup Builder',
  supportEmail: 'support@test.com',
  timezone: 'America/New_York',
  maintenanceMode: false,
  maintenanceMessage: "We'll be back shortly.",
  logoUrl: null,
}

describe('GeneralSettings', () => {
  it('pre-fills form with current settings', () => {
    render(
      <GeneralSettings
        settings={mockSettings}
        isLoading={false}
        onSave={vi.fn()}
      />,
    )
    expect(screen.getByDisplayValue('AI Startup Builder')).toBeInTheDocument()
    expect(screen.getByDisplayValue('support@test.com')).toBeInTheDocument()
  })

  it('maintenance mode switch starts in OFF state', () => {
    render(
      <GeneralSettings
        settings={mockSettings}
        isLoading={false}
        onSave={vi.fn()}
      />,
    )
    const toggle = screen.getByRole('switch')
    expect(toggle.getAttribute('aria-checked')).toBe('false')
  })

  it('turning on maintenance mode shows amber warning', async () => {
    render(
      <GeneralSettings
        settings={mockSettings}
        isLoading={false}
        onSave={vi.fn()}
      />,
    )
    const toggle = screen.getByRole('switch')
    fireEvent.click(toggle)
    await waitFor(() => {
      expect(screen.getByText(/maintenance mode is active/i)).toBeInTheDocument()
    })
  })

  it('save button calls onSave with form data', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <GeneralSettings
        settings={mockSettings}
        isLoading={false}
        onSave={onSave}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /save general/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
  })

  it('renders shimmer when isLoading=true', () => {
    const { container } = render(
      <GeneralSettings
        settings={undefined}
        isLoading={true}
        onSave={vi.fn()}
      />,
    )
    expect(container.querySelectorAll('.shimmer').length).toBeGreaterThan(0)
  })
})
