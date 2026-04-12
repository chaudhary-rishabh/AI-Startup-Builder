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
import { generateDocx } from '../../src/services/docxExport.service.js'

describe('docxExport.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(projectsQueries.findProjectById).mockResolvedValue({
      id: 'p1',
      name: 'Docx Proj',
      emoji: '📄',
    } as never)
    vi.mocked(phaseOutputsQueries.findAllPhaseOutputs).mockResolvedValue([])
    vi.mocked(projectFilesQueries.findFilesByProject).mockResolvedValue([])
    vi.mocked(canvasQueries.findCanvasByProjectId).mockResolvedValue(undefined)
  })

  it('generateDocx returns non-empty buffer', async () => {
    const buf = await generateDocx('p1', [1, 2])
    expect(buf.length).toBeGreaterThan(200)
    expect(buf.subarray(0, 2).toString('utf8')).toBe('PK')
  })

  it('does not throw when phase outputs are missing', async () => {
    await expect(generateDocx('p1', [1, 2, 3, 4, 5, 6])).resolves.toBeInstanceOf(Buffer)
  })
})
