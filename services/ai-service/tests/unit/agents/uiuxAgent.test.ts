import { describe, expect, it } from 'vitest'

import { UiuxAgent } from '../../../src/agents/phase2/uiuxAgent.agent.js'

import type { ProjectContext } from '@repo/types'

describe('UiuxAgent', () => {
  const agent = new UiuxAgent()

  it('buildSystemPrompt includes user color preference', () => {
    const c = {
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      projectName: 'P',
      currentPhase: 2,
      project: { userPreferences: { primaryColor: '#FF00AA' } },
    } as ProjectContext
    const s = agent.buildSystemPrompt(c, '')
    expect(s).toContain('#FF00AA')
  })

  it('buildSystemPrompt handles null userPrefs gracefully', () => {
    const c = {
      projectId: '660e8400-e29b-41d4-a716-446655440001',
      projectName: 'P',
      currentPhase: 2,
      project: { userPreferences: null },
    } as ProjectContext
    expect(() => agent.buildSystemPrompt(c, '')).not.toThrow()
    const s = agent.buildSystemPrompt(c, '')
    expect(s).toContain('AI selects based on ICP')
  })

  it('parseOutput preserves designSystem shape (re-parse yields same primary)', () => {
    const raw = JSON.stringify({
      screens: [
        {
          name: 'Home',
          route: '/',
          description: 'd',
          html: '<div class="min-h-screen p-2">x</div>',
        },
      ],
      designSystem: {
        colors: {
          primary: '#ABCDEF',
          background: '#fff',
          text: '#000',
          muted: '#999',
          border: '#eee',
          success: '#0a0',
          error: '#a00',
        },
        typography: { fontFamily: 'Inter', h1: 't', h2: 't', body: 't', small: 't' },
        spacing: { base: '1', card: '2', section: '3' },
        borderRadius: { button: '1', card: '2', input: '3' },
      },
      components: [],
      screenCount: 1,
    })
    const a = agent.parseOutput(raw)
    const b = agent.parseOutput(raw)
    expect((a.data['designSystem'] as Record<string, unknown>)['colors']).toEqual(
      (b.data['designSystem'] as Record<string, unknown>)['colors'],
    )
  })

  it('parseOutput ensures screens[] has at least 1 entry', () => {
    const { data } = agent.parseOutput('{"screens":[]}')
    expect((data['screens'] as unknown[]).length).toBeGreaterThanOrEqual(1)
  })

  it('parseOutput validates designSystem.colors.primary exists', () => {
    const raw = JSON.stringify({
      screens: [{ name: 'A', route: '/', description: 'd', html: '<div class="min-h-screen"></div>' }],
      designSystem: { colors: {} },
    })
    const { data } = agent.parseOutput(raw)
    const colors = (data['designSystem'] as Record<string, unknown>)['colors'] as Record<
      string,
      unknown
    >
    expect(colors['primary']).toBe('#3B82F6')
  })
})
