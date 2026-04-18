import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { FrameViewer } from '@/components/phases/phase3/FrameViewer'
import { useCanvasStore } from '@/store/canvasStore'

describe('FrameViewer', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      screens: [
        {
          screenName: 'Dashboard',
          html: '<!doctype html><html><body>Dashboard</body></html>',
          route: '/dashboard',
          generatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      selectedScreen: 'Dashboard',
    })
  })

  it('renders sandboxed iframe', () => {
    render(<FrameViewer iframeWidth={1024} zoom={1} />)
    const iframe = screen.getByTestId('frame-viewer-iframe')
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin')
  })

  it('shows phone chrome for mobile widths', () => {
    render(<FrameViewer iframeWidth={375} zoom={1} />)
    expect(screen.getByTestId('phone-chrome')).toBeInTheDocument()
  })
})
