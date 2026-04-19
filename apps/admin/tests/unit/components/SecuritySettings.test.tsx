import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SecuritySettings } from '@/components/settings/SecuritySettings'
import type { SecuritySettings as SecuritySettingsType } from '@/types'
import { vi } from 'vitest'

vi.mock('@/lib/api/settings.api', () => ({
  invalidateAdminSessions: vi
    .fn()
    .mockResolvedValue({ sessionsInvalidated: 4 }),
}))

const mockSettings: SecuritySettingsType = {
  force2FAForAdmins: true,
  sessionTimeoutMinutes: 60,
  ipAllowlist: ['203.0.113.0/24'],
  apiRateLimitPerMinute: 100,
  maxLoginAttempts: 3,
  lockoutDurationMinutes: 15,
}

describe('SecuritySettings', () => {
  it('Force 2FA switch shows enabled state', () => {
    render(
      <SecuritySettings
        settings={mockSettings}
        isLoading={false}
        onSave={vi.fn()}
      />,
    )
    const toggle = screen.getByRole('switch')
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })

  it('session timeout pre-filled with 60', () => {
    render(
      <SecuritySettings
        settings={mockSettings}
        isLoading={false}
        onSave={vi.fn()}
      />,
    )
    expect(screen.getByDisplayValue('60')).toBeInTheDocument()
  })

  it('IP allowlist shows existing CIDR', () => {
    render(
      <SecuritySettings
        settings={mockSettings}
        isLoading={false}
        onSave={vi.fn()}
      />,
    )
    expect(screen.getByText('203.0.113.0/24')).toBeInTheDocument()
  })

  it('adding IP chip and removing it', async () => {
    render(
      <SecuritySettings
        settings={mockSettings}
        isLoading={false}
        onSave={vi.fn()}
      />,
    )
    const ipInput = screen.getByPlaceholderText(/e\.g\.\s*203\.0\.113\.0\/24/i)
    fireEvent.change(ipInput, { target: { value: '10.0.0.0/8' } })
    fireEvent.click(screen.getByRole('button', { name: /\+ add/i }))
    await waitFor(() =>
      expect(screen.getByText('10.0.0.0/8')).toBeInTheDocument(),
    )
    const removeBtn = screen.getByRole('button', {
      name: /remove 10\.0\.0\.0\/8/i,
    })
    fireEvent.click(removeBtn)
    await waitFor(() =>
      expect(screen.queryByText('10.0.0.0/8')).not.toBeInTheDocument(),
    )
  })

  it('Danger Zone section visible', () => {
    render(
      <SecuritySettings
        settings={mockSettings}
        isLoading={false}
        onSave={vi.fn()}
      />,
    )
    expect(screen.getByText(/danger zone/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /invalidate all sessions/i }),
    ).toBeInTheDocument()
  })

  it('save calls onSave', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <SecuritySettings
        settings={mockSettings}
        isLoading={false}
        onSave={onSave}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /save security/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
  })
})
