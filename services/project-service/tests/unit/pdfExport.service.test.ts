import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/db/queries/projects.queries.js', () => ({
  findProjectById: vi.fn(),
}))
vi.mock('../../src/db/queries/phaseOutputs.queries.js', () => ({
  findAllPhaseOutputs: vi.fn(),
}))
vi.mock('../../src/db/queries/projectFiles.queries.js', () => ({
  findFilesByProject: vi.fn(),
}))
vi.mock('../../src/db/queries/designCanvas.queries.js', () => ({
  findCanvasByProjectId: vi.fn(),
}))

import * as canvasQueries from '../../src/db/queries/designCanvas.queries.js'
import * as phaseOutputsQueries from '../../src/db/queries/phaseOutputs.queries.js'
import * as projectFilesQueries from '../../src/db/queries/projectFiles.queries.js'
import * as projectsQueries from '../../src/db/queries/projects.queries.js'
import { generatePdf } from '../../src/services/pdfExport.service.js'

describe('pdfExport.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(projectsQueries.findProjectById).mockResolvedValue({
      id: 'p1',
      name: 'PDF Proj',
      emoji: '📕',
    } as never)
    vi.mocked(phaseOutputsQueries.findAllPhaseOutputs).mockResolvedValue([])
    vi.mocked(projectFilesQueries.findFilesByProject).mockResolvedValue([])
    vi.mocked(canvasQueries.findCanvasByProjectId).mockResolvedValue(undefined)
  })

  it('generatePdf returns non-empty buffer', async () => {
    const buf = await generatePdf('p1', [1])
    expect(buf.length).toBeGreaterThan(100)
    expect(buf.subarray(0, 4).toString('utf8')).toBe('%PDF')
  })
})
