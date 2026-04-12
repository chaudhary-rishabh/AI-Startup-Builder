import { beforeEach, describe, expect, it, vi } from 'vitest'

const canvasMocks = vi.hoisted(() => ({
  deleteCanvas: vi.fn(),
}))

const filesMocks = vi.hoisted(() => ({
  deleteAllFilesByProject: vi.fn(),
}))

const projectsMocks = vi.hoisted(() => ({
  findProjectsByUserId: vi.fn(),
  softDeleteProject: vi.fn(),
}))

vi.mock('../../src/db/queries/designCanvas.queries.js', () => canvasMocks)
vi.mock('../../src/db/queries/projectFiles.queries.js', () => filesMocks)
vi.mock('../../src/db/queries/projects.queries.js', () => projectsMocks)

import { handleUserDeleted } from '../../src/events/handlers/userDeleted.handler.js'

describe('handleUserDeleted', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440001'
  const p1 = '660e8400-e29b-41d4-a716-446655440001'
  const p2 = '660e8400-e29b-41d4-a716-446655440002'

  beforeEach(() => {
    vi.clearAllMocks()
    projectsMocks.softDeleteProject.mockResolvedValue({ deleted: true, deletedAt: new Date().toISOString() })
    canvasMocks.deleteCanvas.mockResolvedValue(undefined)
    filesMocks.deleteAllFilesByProject.mockResolvedValue(undefined)
  })

  it('warns and returns on invalid payload', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await handleUserDeleted({ userId: 'not-a-uuid' })
    expect(warn).toHaveBeenCalled()
    expect(projectsMocks.findProjectsByUserId).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('soft-deletes each project and cleans canvas + files', async () => {
    projectsMocks.findProjectsByUserId.mockResolvedValue({
      data: [
        { id: p1 } as never,
        { id: p2 } as never,
      ],
      total: 2,
    })

    await handleUserDeleted({ userId })

    expect(projectsMocks.findProjectsByUserId).toHaveBeenCalledWith(userId, {
      status: 'all',
      page: 1,
      limit: 1000,
    })
    expect(projectsMocks.softDeleteProject).toHaveBeenCalledWith(p1, userId)
    expect(projectsMocks.softDeleteProject).toHaveBeenCalledWith(p2, userId)
    expect(canvasMocks.deleteCanvas).toHaveBeenCalledWith(p1)
    expect(canvasMocks.deleteCanvas).toHaveBeenCalledWith(p2)
    expect(filesMocks.deleteAllFilesByProject).toHaveBeenCalledWith(p1)
    expect(filesMocks.deleteAllFilesByProject).toHaveBeenCalledWith(p2)
  })
})
