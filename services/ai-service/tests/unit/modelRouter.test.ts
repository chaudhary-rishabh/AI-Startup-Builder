import { describe, expect, it } from 'vitest'

import {
  getMaxOutputTokens,
  getRAGEligibleAgents,
  resolveModel,
  selectModel,
  selectModelForContextGeneration,
} from '../../src/services/modelRouter.service.js'

describe('modelRouter', () => {
  it('maps prd_generator to minimax', () => {
    expect(selectModel('prd_generator')).toBe('MiniMax-M2.7')
  })

  it('maps idea_analyzer to minimax', () => {
    expect(selectModel('idea_analyzer')).toBe('MiniMax-M2.7')
  })

  it('maps backend to deepseek', () => {
    expect(selectModel('backend')).toBe('deepseek-v4-flash')
  })

  it('resolveModel returns deepseek client for integration', () => {
    const r = resolveModel('integration')
    expect(r.role).toBe('deepseek')
    expect(r.model).toBe('deepseek-v4-flash')
  })

  it('selectModelForContextGeneration returns gemini model id', () => {
    expect(selectModelForContextGeneration()).toBe('gemini-2.0-flash')
  })

  it('getRAGEligibleAgents returns exactly four agents', () => {
    const agents = getRAGEligibleAgents()
    expect(agents).toHaveLength(4)
    expect(new Set(agents).size).toBe(4)
  })

  it('phase 4 agents are not RAG eligible', () => {
    const rag = new Set(getRAGEligibleAgents())
    expect(rag.has('backend')).toBe(false)
    expect(rag.has('frontend')).toBe(false)
  })

  it('getMaxOutputTokens for backend and frontend', () => {
    expect(getMaxOutputTokens('backend')).toBe(16_384)
    expect(getMaxOutputTokens('frontend')).toBe(16_384)
    expect(getMaxOutputTokens('prd_generator')).toBe(8192)
    expect(getMaxOutputTokens('uiux')).toBe(8192)
    expect(getMaxOutputTokens('testing')).toBe(8192)
    expect(getMaxOutputTokens('growth_strategy')).toBe(8192)
    expect(getMaxOutputTokens('idea_analyzer')).toBe(4096)
  })
})
