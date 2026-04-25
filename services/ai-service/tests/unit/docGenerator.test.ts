import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProjectContext } from '@repo/types'

const chatCompleteMock = vi.hoisted(() => vi.fn())

vi.mock('../../src/lib/providers.js', () => ({
  chatComplete: (...a: unknown[]) => chatCompleteMock(...a),
  geminiComplete: vi.fn(),
  streamChat: vi.fn(),
  streamChatCollect: vi.fn(),
  chatCompleteWithUsage: vi.fn(),
  minimaxClient: {},
  MINIMAX_MODEL: 'MiniMax-M2.7',
  deepseekClient: {},
  DEEPSEEK_MODEL: 'deepseek-v4-flash',
  deepseekR1Client: {},
  DEEPSEEK_R1_MODEL: 'deepseek-reasoner',
  geminiClient: {},
  GEMINI_MODEL: 'gemini-2.0-flash',
}))

import {
  buildDocContent,
  DOC_DEFINITIONS,
  generatePhaseDoc,
  getRelevantOutput,
} from '../../src/services/docGenerator.service.js'

describe('docGenerator.service', () => {
  afterEach(() => {
    vi.clearAllMocks()
    chatCompleteMock.mockReset()
  })

  it('getRelevantOutput: doc 6 strips to screen metadata only shape', () => {
    const doc = DOC_DEFINITIONS.find((d) => d.docNumber === 6)!
    const ctx = {
      phase3Output: {
        screens: [{ screenName: 'Home', route: '/', html: '<div/>' }],
      },
    } as unknown as ProjectContext
    const out = getRelevantOutput(doc, ctx)
    expect(out['screens']).toEqual([{ screenName: 'Home', route: '/' }])
  })

  it('buildDocContent: uses MiniMax to format output', async () => {
    chatCompleteMock.mockResolvedValue('# PRD\n\n- Item')
    const doc = DOC_DEFINITIONS.find((d) => d.docNumber === 2)!
    const ctx = {
      phase2Output: { features: [{ name: 'Core', priority: 'must', description: 'd' }] },
    } as unknown as ProjectContext
    const md = await buildDocContent(doc, ctx)
    expect(md).toContain('# PRD')
    expect(createMock).toHaveBeenCalled()
  })

  it('buildDocContent: falls back to JSON.stringify on Haiku error', async () => {
    createMock.mockRejectedValue(new Error('api down'))
    const doc = DOC_DEFINITIONS.find((d) => d.docNumber === 2)!
    const ctx = {
      phase2Output: { features: [{ name: 'Core', priority: 'must', description: 'd' }] },
    } as unknown as ProjectContext
    const md = await buildDocContent(doc, ctx)
    expect(md).toContain('```json')
    expect(md).toContain('Core')
  })

  it('generatePhaseDoc: saves file to project_files for each doc in phase', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { saved: true } }), { status: 200 }),
    )
    chatCompleteMock.mockResolvedValue('# Doc')
    const ctx = { phase1Output: { verdict: 'yes' } } as unknown as ProjectContext
    await generatePhaseDoc(1, 'proj-1', ctx)
    const posts = fetchSpy.mock.calls.filter((c) => (c[0] as string).includes('/internal/projects/'))
    expect(posts.length).toBeGreaterThanOrEqual(1)
    fetchSpy.mockRestore()
  })

  it('generatePhaseDoc: does not throw when project_files save fails', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('err', { status: 500 }))
    chatCompleteMock.mockResolvedValue('# Doc')
    const ctx = { phase1Output: { verdict: 'yes' } } as unknown as ProjectContext
    await expect(generatePhaseDoc(1, 'proj-1', ctx)).resolves.toBeUndefined()
    fetchSpy.mockRestore()
  })
})
