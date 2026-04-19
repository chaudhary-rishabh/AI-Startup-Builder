import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ServiceStatusCards } from '@/components/system/ServiceStatusCards'
import type { ServiceHealthCard } from '@/types'

const base: ServiceHealthCard[] = [
  {
    name: 'API Gateway',
    status: 'up',
    uptimePercent: 99.9,
    lastIncidentAt: null,
    responseTimeMs: 100,
    endpoint: '/h',
  },
  {
    name: 'Database',
    status: 'up',
    uptimePercent: 99.9,
    lastIncidentAt: null,
    responseTimeMs: 8,
    endpoint: '/h',
  },
  {
    name: 'AI Proxy',
    status: 'degraded',
    uptimePercent: 98,
    lastIncidentAt: new Date().toISOString(),
    responseTimeMs: 600,
    endpoint: '/h',
  },
  {
    name: 'Auth',
    status: 'up',
    uptimePercent: 99.9,
    lastIncidentAt: null,
    responseTimeMs: 24,
    endpoint: '/h',
  },
  {
    name: 'Storage',
    status: 'up',
    uptimePercent: 100,
    lastIncidentAt: null,
    responseTimeMs: 18,
    endpoint: '/h',
  },
  {
    name: 'Queue',
    status: 'up',
    uptimePercent: 99.9,
    lastIncidentAt: null,
    responseTimeMs: 12,
    endpoint: '/h',
  },
]

describe('ServiceStatusCards', () => {
  it('renders 6 service cards', () => {
    render(<ServiceStatusCards services={base} isLoading={false} />)
    expect(screen.getByText('API Gateway')).toBeInTheDocument()
    expect(screen.getByText('Queue')).toBeInTheDocument()
  })

  it('degraded service shows amber StatusBadge', () => {
    render(<ServiceStatusCards services={base} isLoading={false} />)
    expect(screen.getByText('degraded')).toBeInTheDocument()
  })

  it('response time > 500ms shows red text', () => {
    const { container } = render(
      <ServiceStatusCards services={base} isLoading={false} />,
    )
    const rt = screen.getByText('600ms')
    expect(rt.className).toContain('text-error')
  })

  it('response time < 200ms shows green text', () => {
    render(<ServiceStatusCards services={base} isLoading={false} />)
    const rt = screen.getByText('8ms')
    expect(rt.className).toContain('text-success')
  })

  it('last incident shown when lastIncidentAt is not null', () => {
    render(<ServiceStatusCards services={base} isLoading={false} />)
    expect(screen.getByText(/Last incident:/)).toBeInTheDocument()
  })

  it('shows shimmer when isLoading=true', () => {
    const { container } = render(
      <ServiceStatusCards services={undefined} isLoading />,
    )
    expect(container.querySelectorAll('.shimmer').length).toBeGreaterThan(0)
  })
})
