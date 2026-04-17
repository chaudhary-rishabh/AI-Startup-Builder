import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ValidationScoreCircle } from '@/components/phases/phase1/ValidationScoreCircle'

describe('ValidationScoreCircle', () => {
  it('uses green stroke for >= 70', () => {
    const { container } = render(<ValidationScoreCircle score={82} />)
    const circles = container.querySelectorAll('circle')
    expect(circles[1]?.getAttribute('stroke')).toBe('#16A34A')
  })

  it('uses amber stroke for 40-69', () => {
    const { container } = render(<ValidationScoreCircle score={45} />)
    const circles = container.querySelectorAll('circle')
    expect(circles[1]?.getAttribute('stroke')).toBe('#D97706')
  })

  it('uses red stroke for < 40 and has a11y label', () => {
    const { container } = render(<ValidationScoreCircle score={25} />)
    const circles = container.querySelectorAll('circle')
    expect(circles[1]?.getAttribute('stroke')).toBe('#DC2626')
    expect(screen.getByRole('img', { name: /Validation score: 25 out of 100/ })).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })
})
