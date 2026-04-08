import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { CopyButton } from '../../src/components/custom/CopyButton'

// Mock the Clipboard API (not available in jsdom)
const mockWriteText = vi.fn()
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
})

describe('CopyButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockWriteText.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders the copy button with correct aria-label', () => {
    render(<CopyButton text="hello world" />)
    expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeInTheDocument()
  })

  it('calls navigator.clipboard.writeText with the correct text on click', async () => {
    render(<CopyButton text="npm install react" />)
    const button = screen.getByRole('button')

    await act(async () => {
      fireEvent.click(button)
    })

    expect(mockWriteText).toHaveBeenCalledOnce()
    expect(mockWriteText).toHaveBeenCalledWith('npm install react')
  })

  it('shows "Copied!" aria-label immediately after click', async () => {
    render(<CopyButton text="text" />)
    const button = screen.getByRole('button')

    await act(async () => {
      fireEvent.click(button)
    })

    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
  })

  it('reverts to copy icon after 2000ms', async () => {
    render(<CopyButton text="text" />)
    const button = screen.getByRole('button')

    await act(async () => {
      fireEvent.click(button)
    })

    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeInTheDocument()
  })

  it('does not revert before 2000ms have passed', async () => {
    render(<CopyButton text="text" />)
    const button = screen.getByRole('button')

    await act(async () => {
      fireEvent.click(button)
    })

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    // Still showing "Copied!" state
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
  })

  it('handles clipboard API failure silently', async () => {
    mockWriteText.mockRejectedValueOnce(new Error('Permission denied'))

    render(<CopyButton text="text" />)
    const button = screen.getByRole('button')

    // Should not throw
    await act(async () => {
      fireEvent.click(button)
    })

    // Stays on copy state since clipboard failed
    expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeInTheDocument()
  })
})
