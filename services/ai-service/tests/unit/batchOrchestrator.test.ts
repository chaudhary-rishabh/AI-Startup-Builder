import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  calculateMaxTokens,
  findParallelGroups,
  inferLanguage,
  readFileFromProjectFiles,
} from '../../src/services/batchOrchestrator.service.js'
import type { FileSpec } from '../../src/types/phase4.types.js'

describe('batchOrchestrator helpers', () => {
  it('findParallelGroups: returns independent batches together', () => {
    const files: FileSpec[] = [
      {
        path: '/a.ts',
        description: 'a',
        layer: 'db',
        batchNumber: 1,
        complexity: 'simple',
        estimatedLines: 10,
        dependencies: [],
      },
      {
        path: '/b.ts',
        description: 'b',
        layer: 'config',
        batchNumber: 2,
        complexity: 'simple',
        estimatedLines: 10,
        dependencies: [],
      },
    ]
    expect(findParallelGroups(files)).toEqual([[1, 2]])
  })

  it('calculateMaxTokens: complex=8192, medium=4096, simple=2048', () => {
    expect(calculateMaxTokens('complex')).toBe(8192)
    expect(calculateMaxTokens('medium')).toBe(4096)
    expect(calculateMaxTokens('simple')).toBe(2048)
  })

  it("inferLanguage: '.ts' → 'typescript', '.yml' → 'yaml'", () => {
    expect(inferLanguage('src/x.ts')).toBe('typescript')
    expect(inferLanguage('ci.yml')).toBe('yaml')
  })

  it("readFileFromProjectFiles: returns '' when file not found", async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { content: '', found: false } }), {
        status: 200,
      }),
    )
    const body = await readFileFromProjectFiles('p1', 'missing.ts')
    expect(body).toBe('')
    fetchSpy.mockRestore()
  })
})
