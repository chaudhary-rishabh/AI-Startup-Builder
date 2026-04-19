import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { StatusBadge } from '@/components/common/StatusBadge'

describe('StatusBadge', () => {
  it('active → green classes', () => {
    const { container } = render(<StatusBadge status="active" />)
    expect(container.firstChild).toHaveClass('bg-green-50', 'text-success')
  })

  it('suspended → red classes', () => {
    const { container } = render(<StatusBadge status="suspended" />)
    expect(container.firstChild).toHaveClass('bg-red-50', 'text-error')
  })

  it('unverified → amber classes', () => {
    const { container } = render(<StatusBadge status="unverified" />)
    expect(container.firstChild).toHaveClass('bg-amber-50', 'text-warning')
  })

  it('up → green with dot', () => {
    const { container } = render(<StatusBadge status="up" />)
    expect(container.firstChild).toHaveClass('bg-green-50', 'text-success')
    expect(container.querySelector('.rounded-full')).toBeTruthy()
  })

  it('degraded → amber with dot', () => {
    const { container } = render(<StatusBadge status="degraded" />)
    expect(container.firstChild).toHaveClass('bg-amber-50', 'text-warning')
  })

  it('down → red with dot', () => {
    const { container } = render(<StatusBadge status="down" />)
    expect(container.firstChild).toHaveClass('bg-red-50', 'text-error')
  })

  it('succeeded → green', () => {
    const { container } = render(<StatusBadge status="succeeded" />)
    expect(container.firstChild).toHaveClass('bg-green-50', 'text-success')
  })

  it('refunded → blue', () => {
    const { container } = render(<StatusBadge status="refunded" />)
    expect(container.firstChild).toHaveClass('bg-blue-50', 'text-blue-600')
  })

  it('size sm applies smaller text class', () => {
    const { container } = render(<StatusBadge status="active" size="sm" />)
    expect(container.firstChild).toHaveClass('text-[10px]')
  })
})
