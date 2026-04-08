import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { AgentStatusDot } from '../../src/components/custom/AgentStatusDot'

describe('AgentStatusDot', () => {
  it('renders with correct aria-label for idle status', () => {
    const { container } = render(<AgentStatusDot status="idle" />)
    const wrapper = container.querySelector('[role="status"]')
    expect(wrapper).toHaveAttribute('aria-label', 'Agent status: Idle')
  })

  it('renders with correct aria-label for running status', () => {
    const { container } = render(<AgentStatusDot status="running" />)
    const wrapper = container.querySelector('[role="status"]')
    expect(wrapper).toHaveAttribute('aria-label', 'Agent status: Running')
  })

  it('renders with correct aria-label for done status', () => {
    const { container } = render(<AgentStatusDot status="done" />)
    const wrapper = container.querySelector('[role="status"]')
    expect(wrapper).toHaveAttribute('aria-label', 'Agent status: Done')
  })

  it('renders with correct aria-label for error status', () => {
    const { container } = render(<AgentStatusDot status="error" />)
    const wrapper = container.querySelector('[role="status"]')
    expect(wrapper).toHaveAttribute('aria-label', 'Agent status: Error')
  })

  it('applies amber dot color class for running status', () => {
    const { container } = render(<AgentStatusDot status="running" />)
    // The solid dot (relative span)
    const dot = container.querySelector('.bg-amber-400')
    expect(dot).toBeInTheDocument()
  })

  it('applies animate-ping class (pulsing ring) for running status', () => {
    const { container } = render(<AgentStatusDot status="running" />)
    const pingSpan = container.querySelector('.animate-ping')
    expect(pingSpan).toBeInTheDocument()
  })

  it('does NOT apply animate-ping for idle status', () => {
    const { container } = render(<AgentStatusDot status="idle" />)
    expect(container.querySelector('.animate-ping')).not.toBeInTheDocument()
  })

  it('does NOT apply animate-ping for done status', () => {
    const { container } = render(<AgentStatusDot status="done" />)
    expect(container.querySelector('.animate-ping')).not.toBeInTheDocument()
  })

  it('does NOT apply animate-ping for error status', () => {
    const { container } = render(<AgentStatusDot status="error" />)
    expect(container.querySelector('.animate-ping')).not.toBeInTheDocument()
  })

  it('applies green dot for done status', () => {
    const { container } = render(<AgentStatusDot status="done" />)
    expect(container.querySelector('.bg-green-500')).toBeInTheDocument()
  })

  it('applies red dot for error status', () => {
    const { container } = render(<AgentStatusDot status="error" />)
    expect(container.querySelector('.bg-red-500')).toBeInTheDocument()
  })

  it('applies gray dot for idle status', () => {
    const { container } = render(<AgentStatusDot status="idle" />)
    expect(container.querySelector('.bg-slate-300')).toBeInTheDocument()
  })
})
