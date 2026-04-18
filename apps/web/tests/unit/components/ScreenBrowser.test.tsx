import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ScreenBrowser } from '@/components/phases/phase3/ScreenBrowser'
import { useCanvasStore } from '@/store/canvasStore'
import type { WireframeScreen } from '@/types'

const wireframes: WireframeScreen[] = [
  { id: 'w1', name: 'Dashboard', blocks: [] },
  { id: 'w2', name: 'Inventory', blocks: [] },
  { id: 'w3', name: 'Settings', blocks: [] },
]

describe('ScreenBrowser', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      screens: [
        { screenName: 'Dashboard', html: '<html/>', route: '/dashboard', generatedAt: '2026-01-01T00:00:00.000Z' },
      ],
      selectedScreen: 'Dashboard',
    })
  })

  it('shows generated and pending rows', () => {
    render(<ScreenBrowser wireframes={wireframes} generatingScreen={null} onGenerate={vi.fn()} />)
    expect(screen.getByLabelText('Generated')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Pending').length).toBeGreaterThan(0)
  })

  it('clicking generated row sets selected screen', () => {
    render(<ScreenBrowser wireframes={wireframes} generatingScreen={null} onGenerate={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: /Dashboard/i })[0]!)
    expect(useCanvasStore.getState().selectedScreen).toBe('Dashboard')
  })

  it('pending row generate button invokes callback', () => {
    const onGenerate = vi.fn()
    render(<ScreenBrowser wireframes={wireframes} generatingScreen={null} onGenerate={onGenerate} />)
    fireEvent.click(screen.getByRole('button', { name: /Generate Settings/i }))
    expect(onGenerate).toHaveBeenCalled()
  })
})
