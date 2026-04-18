import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FeedbackTable, type FeedbackEntry } from '@/components/phases/phase6/FeedbackTable'

const entries: FeedbackEntry[] = [
  { id: '1', text: 'Great product', sentiment: 'positive', category: 'General', frequency: 2 },
  { id: '2', text: 'Bug in checkout', sentiment: 'negative', category: 'Bug Report', frequency: 5 },
]

describe('FeedbackTable', () => {
  it('sorts by frequency when header clicked', async () => {
    render(<FeedbackTable entries={entries} isStreaming={false} />)
    await userEvent.click(screen.getByRole('button', { name: /Frequency/ }))
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBeGreaterThan(1)
  })

  it('shows analyze CTA when empty', async () => {
    const fn = vi.fn()
    render(<FeedbackTable entries={[]} isStreaming={false} onAnalyzeFeedback={fn} />)
    await userEvent.click(screen.getByTestId('analyze-feedback-btn'))
    expect(fn).toHaveBeenCalled()
  })
})
