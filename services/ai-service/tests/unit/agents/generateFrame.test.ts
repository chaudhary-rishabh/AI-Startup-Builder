import { describe, expect, it } from 'vitest'

import { GenerateFrameAgent } from '../../../src/agents/phase3/generateFrame.agent.js'

import type { ProjectContext } from '@repo/types'

function baseCtx(over?: Partial<ProjectContext>): ProjectContext {
  return {
    projectId: '660e8400-e29b-41d4-a716-446655440001',
    projectName: 'Acme',
    currentPhase: 3,
    ...over,
  }
}

describe('GenerateFrameAgent', () => {
  const agent = new GenerateFrameAgent()

  it('buildSystemPrompt includes design tokens from phase2Output (nested uiux)', () => {
    const c = baseCtx({
      phase2Output: {
        uiux: {
          designSystem: {
            colors: { primary: '#DEAD00', background: '#111111', text: '#EEEEEE' },
            typography: { fontFamily: 'DM Sans' },
          },
        },
      } as never,
    })
    ;(agent as unknown as { _screenNameForParse: string })._screenNameForParse = 'Dashboard'
    const s = agent.buildSystemPrompt(c, '')
    expect(s).toContain('#DEAD00')
    expect(s).toContain('DM Sans')
    expect(s).toContain('Dashboard')
  })

  it('buildSystemPrompt falls back to default colors when no phase2Output', () => {
    ;(agent as unknown as { _screenNameForParse: string })._screenNameForParse = 'Home'
    const s = agent.buildSystemPrompt(baseCtx(), '')
    expect(s).toContain('#3B82F6')
    expect(s).toContain('#FFFFFF')
  })

  it('buildSystemPrompt includes existing screen HTML (first 300 chars) when available', () => {
    const longHtml = `<div class="min-h-screen">${'x'.repeat(400)}</div>`
    const c = baseCtx({
      phase3Output: {
        screens: [{ screenName: 'Old', html: longHtml }],
      } as never,
    })
    ;(agent as unknown as { _screenNameForParse: string })._screenNameForParse = 'Next'
    const s = agent.buildSystemPrompt(c, '')
    expect(s).toContain('First 300 chars:')
    const head = longHtml.substring(0, 300)
    expect(s).toContain(head)
    expect(s).not.toContain(longHtml.slice(320))
  })

  it('buildSystemPrompt handles empty existingScreens array gracefully', () => {
    const c = baseCtx({ phase3Output: { screens: [] } as never })
    ;(agent as unknown as { _screenNameForParse: string })._screenNameForParse = 'A'
    const s = agent.buildSystemPrompt(c, '')
    expect(s).toContain('first screen')
  })

  it('parseOutput returns success:true for valid HTML with Tailwind classes', () => {
    ;(agent as unknown as { _screenNameForParse: string })._screenNameForParse = 'Login'
    const raw = '<div class="min-h-screen bg-slate-100 p-4"><p class="text-sm">Hi</p></div>'
    const { data, success } = agent.parseOutput(raw)
    expect(success).toBe(true)
    expect((data['frame'] as Record<string, unknown>)['html']).toBe(raw)
    expect(data['screenName']).toBe('Login')
  })

  it('parseOutput returns success:false when output contains html tag', () => {
    ;(agent as unknown as { _screenNameForParse: string })._screenNameForParse = 'X'
    const raw = '<html><div class="min-h-screen"></div></html>'
    const { success, data } = agent.parseOutput(raw)
    expect(success).toBe(false)
    expect(data['_parseError']).toBe(true)
  })

  it('parseOutput returns success:false when output has no div', () => {
    ;(agent as unknown as { _screenNameForParse: string })._screenNameForParse = 'X'
    const { success } = agent.parseOutput('<span class="x">nope</span>')
    expect(success).toBe(false)
  })

  it('parseOutput fallback HTML is valid (contains min-h-screen and flex)', () => {
    ;(agent as unknown as { _screenNameForParse: string })._screenNameForParse = 'X'
    const { data } = agent.parseOutput('<html></html>')
    const html = String((data['frame'] as Record<string, unknown>)['html'])
    expect(html).toContain('min-h-screen')
    expect(html).toContain('flex')
  })
})
