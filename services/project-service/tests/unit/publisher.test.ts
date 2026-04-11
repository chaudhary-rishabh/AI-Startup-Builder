import { beforeEach, describe, expect, it, vi } from 'vitest'

const xadd = vi.fn()

vi.mock('../../src/services/redis.service.js', () => ({
  getRedis: () => ({ xadd }),
}))

import {
  publishExportCompleted,
  publishProjectCreated,
  publishProjectDeleted,
  publishProjectDuplicated,
  publishProjectExportRequested,
  publishProjectPhaseAdvanced,
} from '../../src/events/publisher.js'

describe('publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    xadd.mockResolvedValue('1-0')
  })

  it('publishProjectCreated sends xadd with type project.created', async () => {
    await publishProjectCreated('p1', 'u1', 'Name')
    expect(xadd).toHaveBeenCalled()
    const args = xadd.mock.calls[0] as unknown[]
    expect(args).toContain('project.created')
  })

  it('publishProjectPhaseAdvanced includes phases', async () => {
    await publishProjectPhaseAdvanced('p1', 'u1', 1, 2)
    expect(xadd).toHaveBeenCalled()
    const flat = xadd.mock.calls[0]?.flat() as string[]
    expect(flat).toContain('project.phase_advanced')
  })

  it('publishProjectDeleted', async () => {
    await publishProjectDeleted('p1', 'u1')
    const flat = xadd.mock.calls[0]?.flat() as string[]
    expect(flat).toContain('project.deleted')
  })

  it('publishProjectDuplicated', async () => {
    await publishProjectDuplicated('a', 'b', 'u1')
    const flat = xadd.mock.calls[0]?.flat() as string[]
    expect(flat).toContain('project.duplicated')
  })

  it('publishProjectExportRequested', async () => {
    await publishProjectExportRequested('p1', 'zip', 'job1', [1, 2])
    const flat = xadd.mock.calls[0]?.flat() as string[]
    expect(flat).toContain('project.export_requested')
  })

  it('publishExportCompleted', async () => {
    await publishExportCompleted('u1', 'p1', 'job1', 'https://x', new Date().toISOString())
    const flat = xadd.mock.calls[0]?.flat() as string[]
    expect(flat).toContain('export.completed')
  })
})
