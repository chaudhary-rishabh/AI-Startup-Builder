import { beforeEach, describe, expect, it, vi } from 'vitest'

const projectsMocks = vi.hoisted(() => ({
  findProjectById: vi.fn(),
}))

const phaseMocks = vi.hoisted(() => ({
  findAllPhaseOutputs: vi.fn(),
}))

const fileMocks = vi.hoisted(() => ({
  findFilesByProject: vi.fn(),
}))

vi.mock('../../src/db/queries/projects.queries.js', () => projectsMocks)
vi.mock('../../src/db/queries/phaseOutputs.queries.js', () => phaseMocks)
vi.mock('../../src/db/queries/projectFiles.queries.js', () => fileMocks)

import { generateReadme, generateZip } from '../../src/services/zipExport.service.js'

describe('zipExport.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    projectsMocks.findProjectById.mockResolvedValue({
      id: 'p1',
      name: 'My App',
      emoji: '🚀',
      currentPhase: 3,
      createdAt: new Date('2024-01-01'),
      phaseProgress: { '1': 'complete', '2': 'active' },
    } as never)
    phaseMocks.findAllPhaseOutputs.mockResolvedValue([
      {
        phase: 1,
        outputData: { problemStatement: 'X' },
      },
      {
        phase: 2,
        outputData: {
          frontendStack: 'React',
          backendStack: 'Node',
          database: 'Postgres',
        },
      },
    ] as never)
    fileMocks.findFilesByProject.mockResolvedValue([
      {
        path: 'src/controllers/user.ts',
        content: 'export {}',
      },
    ] as never)
  })

  it('generateZip creates non-empty buffer', async () => {
    const buf = await generateZip('p1', [1, 2])
    expect(buf.length).toBeGreaterThan(50)
    expect(buf.subarray(0, 2).toString('utf8')).toBe('PK')
  })

  it('generateZip includes phase-outputs directory', async () => {
    const buf = await generateZip('p1', [1, 2])
    expect(buf.includes(Buffer.from('phase-outputs/phase-1.json'))).toBe(true)
    expect(buf.includes(Buffer.from('phase-outputs/phase-2.json'))).toBe(true)
  })

  it('generateZip includes src files from project_files', async () => {
    const buf = await generateZip('p1', [1, 2])
    expect(buf.includes(Buffer.from('src/controllers/user.ts'))).toBe(true)
  })

  it('generateZip includes README.md', async () => {
    const buf = await generateZip('p1', [1, 2])
    expect(buf.includes(Buffer.from('README.md'))).toBe(true)
  })

  it('generateReadme includes project name and tech stack', () => {
    const md = generateReadme(
      {
        name: 'Acme',
        emoji: '⭐',
        phaseProgress: { '1': 'complete' },
      } as never,
      {
        outputData: {
          frontendStack: 'Vue',
          backendStack: 'Go',
          database: 'SQLite',
        },
      } as never,
    )
    expect(md).toContain('Acme')
    expect(md).toContain('Vue')
    expect(md).toContain('Go')
    expect(md).toContain('SQLite')
  })
})
