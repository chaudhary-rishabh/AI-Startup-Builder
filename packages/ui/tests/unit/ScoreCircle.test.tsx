import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { ScoreCircle } from '../../src/components/custom/ScoreCircle'

describe('ScoreCircle', () => {
  it('renders the score number in the center', () => {
    render(<ScoreCircle score={75} />)
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('renders /100 label', () => {
    render(<ScoreCircle score={50} />)
    expect(screen.getByText('/100')).toBeInTheDocument()
  })

  it('renders an SVG element', () => {
    const { container } = render(<ScoreCircle score={60} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('SVG has correct viewBox relative to default size', () => {
    const { container } = render(<ScoreCircle score={60} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 96 96')
  })

  it('SVG has correct viewBox for custom size', () => {
    const { container } = render(<ScoreCircle score={60} size={120} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 120 120')
  })

  it('applies green stroke color when score >= 70', () => {
    const { container } = render(<ScoreCircle score={70} />)
    const circles = container.querySelectorAll('circle')
    // Last circle is the score arc
    const scoreArc = circles[circles.length - 1]
    expect(scoreArc).toHaveAttribute('stroke', '#16A34A')
  })

  it('applies green stroke color when score = 100', () => {
    const { container } = render(<ScoreCircle score={100} />)
    const circles = container.querySelectorAll('circle')
    const scoreArc = circles[circles.length - 1]
    expect(scoreArc).toHaveAttribute('stroke', '#16A34A')
  })

  it('applies amber stroke color when score is between 40 and 69', () => {
    const { container } = render(<ScoreCircle score={55} />)
    const circles = container.querySelectorAll('circle')
    const scoreArc = circles[circles.length - 1]
    expect(scoreArc).toHaveAttribute('stroke', '#D97706')
  })

  it('applies amber stroke color when score = 40 (boundary)', () => {
    const { container } = render(<ScoreCircle score={40} />)
    const circles = container.querySelectorAll('circle')
    const scoreArc = circles[circles.length - 1]
    expect(scoreArc).toHaveAttribute('stroke', '#D97706')
  })

  it('applies red stroke color when score < 40', () => {
    const { container } = render(<ScoreCircle score={20} />)
    const circles = container.querySelectorAll('circle')
    const scoreArc = circles[circles.length - 1]
    expect(scoreArc).toHaveAttribute('stroke', '#DC2626')
  })

  it('applies red stroke color when score = 0', () => {
    const { container } = render(<ScoreCircle score={0} />)
    const circles = container.querySelectorAll('circle')
    const scoreArc = circles[circles.length - 1]
    expect(scoreArc).toHaveAttribute('stroke', '#DC2626')
  })

  it('clamps score above 100 to 100', () => {
    render(<ScoreCircle score={150} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('clamps score below 0 to 0', () => {
    render(<ScoreCircle score={-10} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('has role=meter with correct aria attributes', () => {
    const { container } = render(<ScoreCircle score={72} />)
    const meter = container.querySelector('[role="meter"]')
    expect(meter).toBeInTheDocument()
    expect(meter).toHaveAttribute('aria-valuenow', '72')
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '100')
  })
})
