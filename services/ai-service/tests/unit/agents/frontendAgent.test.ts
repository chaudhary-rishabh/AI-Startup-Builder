import { describe, expect, it, vi } from 'vitest'

import type { FileSpec } from '../../../src/types/phase4.types.js'
import type { ProjectContext } from '@repo/types'

import { extractScreenName, FrontendAgent } from '../../../src/agents/phase4/frontendAgent.agent.js'

describe('extractScreenName', () => {
  it('derives login from Next app route group', () => {
    expect(extractScreenName('app/(auth)/login/page.tsx')).toBe('login')
  })

  it('derives dashboard from simple app route', () => {
    expect(extractScreenName('app/dashboard/page.tsx')).toBe('dashboard')
  })

  it('derives sidebar from component file', () => {
    expect(extractScreenName('components/Sidebar.tsx')).toBe('sidebar')
  })
})

describe('FrontendAgent', () => {
  it('buildFilePrompt includes prototype HTML when fetch returns content', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { content: '<div class="min-h-screen">P</div>' } }), {
        status: 200,
      }),
    )
    const agent = new FrontendAgent()
    const file: FileSpec = {
      path: 'app/login/page.tsx',
      description: 'Login page',
      layer: 'frontend-page',
      batchNumber: 2,
      complexity: 'medium',
      estimatedLines: 80,
      dependencies: [],
    }
    const ctx = {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      projectName: 'Acme',
      currentPhase: 4,
      phase2Output: {
        systemDesign: {
          frontendStack: 'Next.js 15',
          apiEndpoints: [{ method: 'POST', path: '/api/login', description: 'Login API' }],
        },
        uiux: {
          designSystem: {
            colors: { primary: '#111111', background: '#FFFFFF', text: '#000000' },
            typography: { fontFamily: 'Inter' },
          },
        },
      },
    } as unknown as ProjectContext

    const { system } = await agent.buildFilePrompt(file, [], ctx)
    expect(system).toContain('HTML PROTOTYPE FOR THIS SCREEN')
    expect(system).toContain('min-h-screen')
    expect(system).toContain('- Use Tailwind classes from the design system only. No hardcoded hex values.')
    fetchSpy.mockRestore()
  })
})
