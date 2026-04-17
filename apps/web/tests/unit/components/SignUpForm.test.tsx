import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SignUpForm } from '@/components/auth/SignUpForm'

const mockPush = vi.fn()
const mockRegister = vi.fn()
const mockVerifyEmail = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/api/auth.api', () => ({
  register: (...args: unknown[]) => mockRegister(...args),
  verifyEmail: (...args: unknown[]) => mockVerifyEmail(...args),
}))

describe('SignUpForm', () => {
  const selectFounderRole = (): void => {
    const nativeSelect = document.querySelector('select')
    if (!nativeSelect) {
      throw new Error('Expected hidden select to exist')
    }
    fireEvent.change(nativeSelect, { target: { value: 'FOUNDER' } })
  }

  beforeEach(() => {
    mockPush.mockReset()
    mockRegister.mockReset()
    mockVerifyEmail.mockReset()
    mockRegister.mockResolvedValue({ userId: 'x', message: 'ok' })
    mockVerifyEmail.mockResolvedValue(undefined)
  })

  it('renders all 5 fields', () => {
    render(<SignUpForm />)
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Role')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('submit without name shows validation error', async () => {
    render(<SignUpForm />)
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument()
  })

  it('submit without role shows validation error', async () => {
    render(<SignUpForm />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'TestPass1' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('Please select your role')).toBeInTheDocument()
  })

  it('weak password shows 1/3 dots', async () => {
    render(<SignUpForm />)
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'abc' } })
    const bars = screen.getByLabelText('password-strength').querySelectorAll('span[style]')
    expect(bars.length).toBe(3)
  })

  it('strong password shows 3/3 dots', async () => {
    render(<SignUpForm />)
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'TestPass1' } })
    const bars = screen.getByLabelText('password-strength').querySelectorAll('span[style]')
    expect(bars.length).toBe(3)
  })

  it('submit without terms shows error', async () => {
    render(<SignUpForm />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'TestPass1' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('You must accept the terms')).toBeInTheDocument()
  })

  it('successful submit calls register once', async () => {
    render(<SignUpForm />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'TestPass1' } })
    fireEvent.click(screen.getByRole('checkbox'))
    selectFounderRole()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1))
  })

  it('ALREADY_EXISTS shows inline error message', async () => {
    mockRegister.mockRejectedValueOnce({ code: 'ALREADY_EXISTS' })
    render(<SignUpForm />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'TestPass1' } })
    fireEvent.click(screen.getByRole('checkbox'))
    selectFounderRole()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument()
  })

  it('loading spinner appears on submit', async () => {
    let resolver: (() => void) | undefined
    mockRegister.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolver = resolve as () => void
        }),
    )
    render(<SignUpForm />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'TestPass1' } })
    fireEvent.click(screen.getByRole('checkbox'))
    selectFounderRole()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled())
    resolver?.()
  })
})
